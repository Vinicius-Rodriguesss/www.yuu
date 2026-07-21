/**
 * Service: GenerateMeetingLink
 *
 * POST /appointments/:id/meeting-link
 * Gera (ou retorna, se já existir) o token único do atendimento.
 * Estrutura preparada para o futuro atendimento com IA — nenhuma
 * integração é feita aqui, apenas o identificador + link persistidos.
 */

import type { Request, Response } from "express";
import { randomBytes } from "node:crypto";
import { eq, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { appointmentsTable } from "../../db/schema/appointments.js";

const GenerateMeetingLink = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const [appointment] = await db
      .select({ id: appointmentsTable.id, meetingToken: appointmentsTable.meetingToken })
      .from(appointmentsTable)
      .where(and(eq(appointmentsTable.id, Number(id)), eq(appointmentsTable.userId, userId)))
      .limit(1);

    if (!appointment) {
      return res.status(404).json({ error: "Agendamento não encontrado" });
    }

    let token = appointment.meetingToken;

    if (!token) {
      token = randomBytes(16).toString("hex");
      await db
        .update(appointmentsTable)
        .set({ meetingToken: token, updatedAt: new Date() })
        .where(eq(appointmentsTable.id, appointment.id));
    }

    return res.status(200).json({
      meetingToken: token,
      meetingPath: `/meeting/${token}`,
    });
  } catch (error) {
    console.error("ERRO MEETING LINK:", error);
    return res.status(500).json({ error: "Erro ao gerar link do atendimento" });
  }
};

export default GenerateMeetingLink;
