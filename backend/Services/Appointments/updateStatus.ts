/**
 * Service: UpdateAppointmentStatus
 *
 * Responsabilidade:
 * Alterar o status de um agendamento.
 *
 * Status permitidos:
 * - confirmed: confirmado
 * - in_progress: em atendimento
 * - completed: atendimento realizado
 * - cancelled: cancelado
 * - no_show: cliente não compareceu
 */

import type { Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { appointmentsTable } from "../../db/schema/appointments.js";
import { sendAppointmentCancelledClientEmail } from "../Email/appointmentEmails.js";
import { restoreStockForAppointment } from "../Products/stock.js";

const UpdateAppointmentStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { status, cancellationReason } = req.body;

    // "scheduled" incluído para permitir desfazer um "Serviço feito" clicado sem querer
    const validStatuses = ["scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: "Status inválido" });
    }

    const [existing] = await db
      .select({ status: appointmentsTable.status })
      .from(appointmentsTable)
      .where(and(eq(appointmentsTable.id, Number(id)), eq(appointmentsTable.userId, userId)))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Agendamento não encontrado" });
    }

    const update: Record<string, unknown> = { status, updatedAt: new Date() };
    if (status === "cancelled") {
      update.cancelledAt = new Date();
      if (cancellationReason) update.cancellationReason = cancellationReason;
    }

    const [updated] = await db
      .update(appointmentsTable)
      .set(update)
      .where(and(eq(appointmentsTable.id, Number(id)), eq(appointmentsTable.userId, userId)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Agendamento não encontrado" });
    }

    if (status === "cancelled" && existing.status !== "cancelled") {
      void sendAppointmentCancelledClientEmail(updated.id, updated.cancellationReason);
      void restoreStockForAppointment(updated.id);
    }

    return res.status(200).json(updated);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao atualizar status" });
  }
};

export default UpdateAppointmentStatus;
