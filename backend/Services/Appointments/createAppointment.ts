/**
 * Service: CreateAppointment
 *
 * Cria um agendamento com validação completa de disponibilidade:
 * - jornada de trabalho (dia/horário do expediente)
 * - intervalo da agenda e delay entre atendimentos
 * - conflitos com outros agendamentos e bloqueios
 * - horários passados
 *
 * Proteção contra concorrência: advisory lock por profissional dentro de
 * transação — dois agendamentos simultâneos no mesmo horário nunca passam.
 *
 * duration e price são snapshots do serviço no momento do agendamento.
 */

import type { Request, Response } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { appointmentsTable } from "../../db/schema/appointments.js";
import { servicesTable } from "../../db/schema/services.js";
import { customersTable } from "../../db/schema/customers.js";
import { validateSlot } from "../Availability/computeDaySlots.js";
import { resolveHomeServiceTravel } from "../Travel/estimateTravel.js";

const CreateAppointment = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { customerId, serviceId, scheduledAt, notes, tzOffsetMin, isHomeService, customerAddressId } = req.body;
    const tzOffset = !isNaN(Number(tzOffsetMin)) ? Number(tzOffsetMin) : 0;
    const homeService = Boolean(isHomeService);

    if (!customerId || !serviceId || !scheduledAt) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes" });
    }

    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({ error: "Data/hora inválida" });
    }

    // Serviço do próprio profissional (snapshot de duration/price)
    const [service] = await db
      .select({ duration: servicesTable.duration, price: servicesTable.price })
      .from(servicesTable)
      .where(and(eq(servicesTable.id, Number(serviceId)), eq(servicesTable.userId, userId)))
      .limit(1);

    if (!service) {
      return res.status(404).json({ error: "Serviço não encontrado" });
    }

    // Cliente precisa pertencer ao profissional
    const [customer] = await db
      .select({ id: customersTable.id })
      .from(customersTable)
      .where(and(eq(customersTable.id, Number(customerId)), eq(customersTable.userId, userId)))
      .limit(1);

    if (!customer) {
      return res.status(404).json({ error: "Cliente não encontrado" });
    }

    // Domicílio: endereço do cliente é obrigatório e o deslocamento entra no tempo ocupado
    let travelMinutes = 0;
    let resolvedAddressId: number | null = null;
    if (homeService) {
      const travel = await resolveHomeServiceTravel(
        userId,
        Number(customerId),
        customerAddressId ? Number(customerAddressId) : undefined
      );
      if (!travel.addressId) {
        return res.status(400).json({
          error: "Atendimento a domicílio exige um endereço cadastrado para o cliente",
        });
      }
      resolvedAddressId = travel.addressId;
      // Se a estimativa falhar (API fora do ar), segue com 0 e registra no log
      travelMinutes = travel.minutes ?? 0;
      if (travel.minutes === null) {
        console.warn(`Deslocamento não calculado para agendamento (cliente ${customerId})`);
      }
    }

    // Transação com advisory lock por profissional: serializa agendamentos
    // concorrentes e revalida a disponibilidade já com o lock em mãos.
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${userId})`);

      const conflict = await validateSlot(
        userId,
        scheduledDate,
        service.duration,
        tzOffset,
        travelMinutes
      );
      if (conflict) {
        return { error: conflict };
      }

      const [created] = await tx
        .insert(appointmentsTable)
        .values({
          userId,
          customerId: Number(customerId),
          serviceId: Number(serviceId),
          scheduledAt: scheduledDate,
          duration: service.duration,
          price: service.price,
          status: "scheduled",
          notes: notes || null,
          isHomeService: homeService,
          travelMinutes,
          customerAddressId: resolvedAddressId,
        })
        .returning();

      return { appointment: created };
    });

    if ("error" in result) {
      return res.status(409).json({ error: result.error });
    }

    return res.status(201).json(result.appointment);
  } catch (error) {
    console.error("ERRO DETALHADO:", error);
    return res.status(500).json({ error: "Erro ao criar agendamento" });
  }
};

export default CreateAppointment;
