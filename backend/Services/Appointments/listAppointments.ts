/**
 * Service: ListAppointments
 *
 * Responsabilidade:
 * Listar agendamentos do profissional, com filtro opcional por data e/ou cliente.
 *
 * Query params:
 * - date (opcional): filtra agendamentos de um dia específico (YYYY-MM-DD)
 * - customerId (opcional): filtra agendamentos de um cliente específico, sem limitar por data —
 *   usado pela busca de cliente no Calendário (achar o agendamento em aberto dele, seja quando for)
 *
 * Exemplo: GET /appointments?date=2025-07-20
 * Exemplo: GET /appointments?customerId=42
 */

import type { Request, Response } from "express";
import { eq, gte, lte, and, asc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { appointmentsTable } from "../../db/schema/appointments.js";
import { attachAppointmentProducts } from "./attachAppointmentProducts.js";

const ListAppointments = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { date, customerId } = req.query;

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

    if (customerId) {
      conditions.push(eq(appointmentsTable.customerId, Number(customerId)));
    }

    const appointments = await db
      .select()
      .from(appointmentsTable)
      .where(and(...conditions))
      .orderBy(asc(appointmentsTable.scheduledAt));

    const withProducts = await attachAppointmentProducts(appointments);

    return res.status(200).json(withProducts);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar agendamentos" });
  }
};

export default ListAppointments;
