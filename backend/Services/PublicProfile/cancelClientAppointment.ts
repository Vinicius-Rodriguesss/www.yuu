/**
 * Service: CancelClientAppointment
 *
 * PATCH /public/:slug/appointments/:id/cancel — exige login do CLIENTE FINAL.
 * O próprio cliente desiste de um agendamento futuro que ele mesmo marcou.
 * Só cancela se o agendamento pertencer a ESTE profissional (slug) e a um
 * customer vinculado à conta do cliente logado — nunca aceita um id de
 * agendamento de outra pessoa. Não deixa cancelar o que já foi concluído,
 * cancelado ou está em atendimento.
 */
import type { Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { usersTable } from "../../db/schema/users.js";
import { customersTable } from "../../db/schema/customers.js";
import { appointmentsTable } from "../../db/schema/appointments.js";
import { sendAppointmentCancelledProfessionalEmail } from "../Email/appointmentEmails.js";
import { restoreStockForAppointment } from "../Products/stock.js";

const CANCELLABLE_STATUSES = ["scheduled", "confirmed"];

const CancelClientAppointment = async (req: Request<{ slug: string; id: string }>, res: Response) => {
  try {
    const { slug, id } = req.params;
    const clientAccountId = (req as any).clientAccountId as number;

    const [user] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.publicSlug, String(slug)))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "Página não encontrada" });
    }

    const [customer] = await db
      .select({ id: customersTable.id })
      .from(customersTable)
      .where(and(eq(customersTable.userId, user.id), eq(customersTable.clientAccountId, clientAccountId)))
      .limit(1);

    if (!customer) {
      return res.status(404).json({ error: "Agendamento não encontrado" });
    }

    const [appointment] = await db
      .select({ id: appointmentsTable.id, status: appointmentsTable.status })
      .from(appointmentsTable)
      .where(and(eq(appointmentsTable.id, Number(id)), eq(appointmentsTable.customerId, customer.id)))
      .limit(1);

    if (!appointment) {
      return res.status(404).json({ error: "Agendamento não encontrado" });
    }

    if (!CANCELLABLE_STATUSES.includes(appointment.status)) {
      return res.status(409).json({ error: "Esse agendamento não pode mais ser cancelado" });
    }

    const [updated] = await db
      .update(appointmentsTable)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        cancellationReason: "Cancelado pelo cliente",
        updatedAt: new Date(),
      })
      .where(eq(appointmentsTable.id, appointment.id))
      .returning();

    void sendAppointmentCancelledProfessionalEmail(appointment.id);
    void restoreStockForAppointment(appointment.id);

    return res.status(200).json(updated);
  } catch (error) {
    console.error("ERRO CANCEL CLIENT APPOINTMENT:", error);
    return res.status(500).json({ error: "Erro ao cancelar agendamento" });
  }
};

export default CancelClientAppointment;
