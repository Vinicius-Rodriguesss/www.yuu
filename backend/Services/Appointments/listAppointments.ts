/**
 * Service: ListAppointments
 *
 * Responsabilidade:
 * Listar agendamentos do profissional, com filtro opcional por data.
 *
 * Query params:
 * - date (opcional): filtra agendamentos de um dia específico (YYYY-MM-DD)
 *
 * Exemplo: GET /appointments?date=2025-07-20
 */

import type { Request, Response } from "express";
import { eq, gte, lte, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { appointmentsTable } from "../../db/schema/appointments.js";

const ListAppointments = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { date } = req.query;

    // Monta array de condições dinamicamente
    const conditions = [eq(appointmentsTable.userId, userId)];

    // Filtro por data: busca agendamentos no intervalo do dia
    if (date) {
      const startOfDay = new Date(String(date));
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);

      conditions.push(gte(appointmentsTable.scheduledAt, startOfDay));
      conditions.push(lte(appointmentsTable.scheduledAt, endOfDay));
    }

    const appointments = await db
      .select()
      .from(appointmentsTable)
      .where(and(...conditions));

    return res.status(200).json(appointments);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar agendamentos" });
  }
};

export default ListAppointments;
