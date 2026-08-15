/**
 * Service: PublicBookAppointment
 *
 * POST /public/:slug/appointments — login do CLIENTE FINAL é opcional
 * (clientAuthOptional): sem login, agenda como convidado (informando nome e
 * celular no corpo). Atendimento a domicílio SEMPRE exige login — depende
 * do endereço salvo na conta do cliente, que não existe pra convidado.
 *
 * Com login: dados pessoais vêm da conta global do cliente; o vínculo com o
 * profissional (linha em customers) é criado/reaproveitado automaticamente,
 * e o endereço de domicílio informado fica salvo na conta pra reaproveitar.
 *
 * Sem login (convidado): usa guestName/guestEmail do corpo pra criar (ou
 * reaproveitar, por email) um customer sem clientAccountId vinculado. A
 * confirmação do agendamento vai por email (customers.email alimenta
 * sendAppointmentConfirmationEmails), já que não coletamos celular do convidado.
 */
import type { Request, Response } from "express";
import { eq, and, or, desc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { usersTable } from "../../db/schema/users.js";
import { servicesTable } from "../../db/schema/services.js";
import { customersTable } from "../../db/schema/customers.js";
import { customerAddressesTable } from "../../db/schema/customerAddresses.js";
import { clientAccountsTable } from "../../db/schema/clientAccounts.js";
import { clientAddressesTable } from "../../db/schema/clientAddresses.js";
import { resolveHomeServiceTravel } from "../Travel/estimateTravel.js";
import { createAppointmentCore } from "../Appointments/createAppointmentCore.js";

interface PublicBookingBody {
  serviceId?: number | string;
  scheduledAt?: string;
  tzOffsetMin?: number | string;
  notes?: string;
  isHomeService?: boolean;
  /** id de um endereço salvo na conta do cliente (GET /client/addresses) */
  addressId?: number | string;
  /** obrigatórios quando não há login (agendamento como convidado) */
  guestName?: string;
  guestEmail?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PublicBookAppointment = async (req: Request<{ slug: string }, {}, PublicBookingBody>, res: Response) => {
  try {
    const { slug } = req.params;
    const clientAccountId = (req as any).clientAccountId as number | undefined;
    const { serviceId, scheduledAt, tzOffsetMin, notes, isHomeService, addressId, guestName, guestEmail } = req.body;

    const [user] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.publicSlug, String(slug)))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "Página não encontrada" });
    }

    if (!serviceId || !scheduledAt) {
      return res.status(400).json({ error: "Serviço e horário são obrigatórios" });
    }

    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({ error: "Data/hora inválida" });
    }

    const tzOffset = !isNaN(Number(tzOffsetMin)) ? Number(tzOffsetMin) : 0;
    const homeService = Boolean(isHomeService);

    if (homeService && !clientAccountId) {
      return res.status(401).json({ error: "Atendimento a domicílio exige login. Faça login ou crie uma conta." });
    }

    const [service] = await db
      .select({ duration: servicesTable.duration, price: servicesTable.price })
      .from(servicesTable)
      .where(and(eq(servicesTable.id, Number(serviceId)), eq(servicesTable.userId, user.id), eq(servicesTable.active, true)))
      .limit(1);

    if (!service) {
      return res.status(404).json({ error: "Serviço não encontrado" });
    }

    let customerId: number;

    if (!clientAccountId) {
      // ===== Agendamento como convidado (sem login) =====
      const cleanGuestName = guestName?.trim() ?? "";
      const cleanGuestEmail = guestEmail?.trim().toLowerCase() ?? "";

      if (cleanGuestName.length < 2) {
        return res.status(400).json({ error: "Informe seu nome para agendar" });
      }
      if (!EMAIL_REGEX.test(cleanGuestEmail)) {
        return res.status(400).json({ error: "Informe um email válido para agendar" });
      }

      const [existingGuestCustomer] = await db
        .select({ id: customersTable.id })
        .from(customersTable)
        .where(and(eq(customersTable.userId, user.id), eq(customersTable.email, cleanGuestEmail)))
        .limit(1);

      if (existingGuestCustomer) {
        customerId = existingGuestCustomer.id;
      } else {
        const [createdGuestCustomer] = await db
          .insert(customersTable)
          .values({
            userId: user.id,
            clientAccountId: null,
            name: cleanGuestName,
            email: cleanGuestEmail,
          })
          .returning();
        if (!createdGuestCustomer) {
          throw new Error("Não foi possível cadastrar o cliente");
        }
        customerId = createdGuestCustomer.id;
      }
    } else {
      // ===== Agendamento com login =====
      const [clientAccount] = await db
        .select()
        .from(clientAccountsTable)
        .where(eq(clientAccountsTable.id, clientAccountId))
        .limit(1);

      if (!clientAccount) {
        return res.status(401).json({ error: "Conta não encontrada, faça login novamente" });
      }

      // Vínculo do cliente com ESTE profissional: primeiro pela conta, depois
      // pelo telefone (cadastros antigos feitos pelo próprio profissional) — e
      // se não existir, cria.
      const [byAccount] = await db
        .select({ id: customersTable.id })
        .from(customersTable)
        .where(and(eq(customersTable.userId, user.id), eq(customersTable.clientAccountId, clientAccountId)))
        .limit(1);

      if (byAccount) {
        customerId = byAccount.id;
      } else {
        // Cadastro antigo feito manualmente pelo profissional (ou criado
        // durante um agendamento anterior como convidado): procura por
        // telefone ou documento antes de criar um registro novo (customers
        // agora tem índice único por profissional nesses campos).
        const matchConditions = [
          eq(customersTable.phone, clientAccount.phone),
          ...(clientAccount.cpf ? [eq(customersTable.document, clientAccount.cpf)] : []),
          ...(clientAccount.email ? [eq(customersTable.email, clientAccount.email)] : []),
        ];

        const [byPhoneOrDocument] = await db
          .select({ id: customersTable.id })
          .from(customersTable)
          .where(and(eq(customersTable.userId, user.id), or(...matchConditions)))
          .limit(1);

        if (byPhoneOrDocument) {
          await db
            .update(customersTable)
            .set({ clientAccountId, updatedAt: new Date() })
            .where(eq(customersTable.id, byPhoneOrDocument.id));
          customerId = byPhoneOrDocument.id;
        } else {
          const [createdCustomer] = await db
            .insert(customersTable)
            .values({
              userId: user.id,
              clientAccountId,
              name: clientAccount.name,
              document: clientAccount.cpf,
              phone: clientAccount.phone,
            })
            .returning();
          if (!createdCustomer) {
            throw new Error("Não foi possível cadastrar o cliente");
          }
          customerId = createdCustomer.id;
        }
      }
    }

    // Domicílio: usa o endereço salvo indicado (addressId) ou o principal da conta
    let travelMinutes = 0;
    let travelDistanceKm = 0;
    let travelCost = 0;
    let resolvedAddressId: number | null = null;
    if (homeService) {
      // homeService só chega aqui com clientAccountId definido (checado acima).
      const loggedClientAccountId = clientAccountId as number;
      let clientAddress;
      if (addressId) {
        [clientAddress] = await db
          .select()
          .from(clientAddressesTable)
          .where(and(eq(clientAddressesTable.id, Number(addressId)), eq(clientAddressesTable.clientAccountId, loggedClientAccountId)))
          .limit(1);
      } else {
        [clientAddress] = await db
          .select()
          .from(clientAddressesTable)
          .where(eq(clientAddressesTable.clientAccountId, loggedClientAccountId))
          .orderBy(desc(clientAddressesTable.isPrimary), desc(clientAddressesTable.id))
          .limit(1);
      }

      if (!clientAddress) {
        return res.status(400).json({ error: "Selecione um endereço para o atendimento a domicílio" });
      }

      const [existingAddresses] = await db
        .select({ id: customerAddressesTable.id })
        .from(customerAddressesTable)
        .where(eq(customerAddressesTable.customerId, customerId))
        .limit(1);

      const [createdAddress] = await db
        .insert(customerAddressesTable)
        .values({
          customerId,
          cep: clientAddress.cep,
          street: clientAddress.street,
          number: clientAddress.number,
          complement: clientAddress.complement || null,
          neighborhood: clientAddress.neighborhood,
          city: clientAddress.city,
          state: clientAddress.state,
          isPrimary: !existingAddresses,
        })
        .returning();

      if (!createdAddress) {
        throw new Error("Não foi possível salvar o endereço");
      }

      const travel = await resolveHomeServiceTravel(user.id, customerId, createdAddress.id);
      if (travel.exceedsMaxDistance) {
        return res.status(400).json({
          error: `Endereço fora do raio de atendimento a domicílio (máximo ${travel.maxDistanceKm} km)`,
        });
      }
      resolvedAddressId = travel.addressId;
      travelMinutes = travel.minutes ?? 0;
      travelDistanceKm = travel.km ?? 0;
      travelCost = travel.travelCost;
    }

    const result = await createAppointmentCore({
      userId: user.id,
      customerId,
      serviceId: Number(serviceId),
      duration: service.duration,
      price: service.price,
      products: [],
      scheduledAt: scheduledDate,
      tzOffsetMin: tzOffset,
      notes: notes?.trim() || null,
      paymentStatus: "unpaid",
      isHomeService: homeService,
      travelMinutes,
      travelDistanceKm,
      travelCost,
      customerAddressId: resolvedAddressId,
    });

    if ("error" in result) {
      return res.status(409).json({ error: result.error });
    }

    return res.status(201).json(result.appointment);
  } catch (error) {
    console.error("ERRO PUBLIC BOOKING:", error);
    return res.status(500).json({ error: "Erro ao criar agendamento" });
  }
};

export default PublicBookAppointment;
