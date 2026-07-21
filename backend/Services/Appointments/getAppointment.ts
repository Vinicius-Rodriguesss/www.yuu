/**
 * Service: GetAppointment
 *
 * Responsabilidade:
 * Buscar um agendamento específico pelo ID, garantindo que pertença ao profissional.
 */

import type { Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { appointmentsTable } from "../../db/schema/appointments.js";

const GetAppointment = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const [appointment] = await db
      .select()
      .from(appointmentsTable)
      .where(and(eq(appointmentsTable.id, Number(id)), eq(appointmentsTable.userId, userId)))
      .limit(1);

    if (!appointment) {
      return res.status(404).json({ error: "Agendamento não encontrado" });
    }

    return res.status(200).json(appointment);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar agendamento" });
  }
};

export default GetAppointment;
