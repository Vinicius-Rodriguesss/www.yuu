/**
 * Service: UpdateAppointment
 *
 * Edita um agendamento existente (cliente, serviço, data/horário, domicílio,
 * observações). Reaproveita a mesma validação de disponibilidade da criação,
 * excluindo o próprio agendamento da checagem de conflito — senão ele
 * sempre colidiria com o próprio horário.
 *
 * Não mexe em status (isso é responsabilidade de PATCH /appointments/:id/status).
 */

import type { Request, Response } from "express";
import { sql, eq, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { appointmentsTable } from "../../db/schema/appointments.js";
import { appointmentProductsTable } from "../../db/schema/appointmentProducts.js";
import { servicesTable } from "../../db/schema/services.js";
import { customersTable } from "../../db/schema/customers.js";
import { resolveHomeServiceTravel } from "../Travel/estimateTravel.js";
import { validateSlot } from "../Availability/computeDaySlots.js";
import { resolveAppointmentProducts } from "./resolveAppointmentProducts.js";

const UpdateAppointment = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const appointmentId = Number(id);
    const { customerId, serviceId, scheduledAt, notes, tzOffsetMin, isHomeService, customerAddressId, paymentStatus, products } = req.body;
    const tzOffset = !isNaN(Number(tzOffsetMin)) ? Number(tzOffsetMin) : 0;
    const homeService = Boolean(isHomeService);

    if (!customerId || !serviceId || !scheduledAt) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes" });
    }

    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({ error: "Data/hora inválida" });
    }

    const [existing] = await db
      .select({ id: appointmentsTable.id, status: appointmentsTable.status })
      .from(appointmentsTable)
      .where(and(eq(appointmentsTable.id, appointmentId), eq(appointmentsTable.userId, userId)))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Agendamento não encontrado" });
    }
    if (["completed", "cancelled", "no_show"].includes(existing.status)) {
      return res.status(409).json({ error: "Não é possível editar um agendamento finalizado ou cancelado" });
    }

    const [service] = await db
      .select({ duration: servicesTable.duration, price: servicesTable.price })
      .from(servicesTable)
      .where(and(eq(servicesTable.id, Number(serviceId)), eq(servicesTable.userId, userId)))
      .limit(1);

    if (!service) {
      return res.status(404).json({ error: "Serviço não encontrado" });
    }

    const [customer] = await db
      .select({ id: customersTable.id })
      .from(customersTable)
      .where(and(eq(customersTable.id, Number(customerId)), eq(customersTable.userId, userId)))
      .limit(1);

    if (!customer) {
      return res.status(404).json({ error: "Cliente não encontrado" });
    }

    let travelMinutes = 0;
    let travelDistanceKm = 0;
    let travelCost = 0;
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

    // Produtos vendidos junto (ex: pomada, shampoo) — soma no preço total do agendamento
    const productsResult = await resolveAppointmentProducts(userId, products);
    if ("error" in productsResult) {
      return res.status(400).json({ error: productsResult.error });
    }
    const totalPrice = (Number(service.price) + productsResult.total).toFixed(2);

    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${userId})`);

      const conflict = await validateSlot(
        userId,
        scheduledDate,
        service.duration,
        tzOffset,
        travelMinutes * 2,
        appointmentId
      );
      if (conflict) {
        return { error: conflict } as const;
      }

      const [updated] = await tx
        .update(appointmentsTable)
        .set({
          customerId: Number(customerId),
          serviceId: Number(serviceId),
          scheduledAt: scheduledDate,
          duration: service.duration,
          price: totalPrice,
          notes: notes || null,
          paymentStatus: paymentStatus === "paid" ? "paid" : "unpaid",
          isHomeService: homeService,
          travelMinutes,
          travelDistanceKm: String(travelDistanceKm),
          travelCost: String(travelCost),
          customerAddressId: homeService ? resolvedAddressId : null,
          updatedAt: new Date(),
        })
        .where(and(eq(appointmentsTable.id, appointmentId), eq(appointmentsTable.userId, userId)))
        .returning();

      // Produtos: apaga e reinsere (mesmo padrão de work_schedule_days), sem diff
      await tx.delete(appointmentProductsTable).where(eq(appointmentProductsTable.appointmentId, appointmentId));
      if (productsResult.resolved.length > 0) {
        await tx.insert(appointmentProductsTable).values(
          productsResult.resolved.map((p) => ({
            appointmentId,
            productId: p.productId,
            name: p.name,
            unitPrice: p.unitPrice,
            quantity: p.quantity,
          }))
        );
      }

      return { appointment: updated } as const;
    });

    if ("error" in result) {
      return res.status(409).json({ error: result.error });
    }

    return res.status(200).json(result.appointment);
  } catch (error) {
    console.error("ERRO DETALHADO:", error);
    return res.status(500).json({ error: "Erro ao editar agendamento" });
  }
};

export default UpdateAppointment;
