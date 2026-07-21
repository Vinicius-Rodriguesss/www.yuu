/**
 * Service: GetDashboard
 *
 * Responsabilidade:
 * Agregar dados reais de agendamentos do profissional logado para o dashboard.
 */

import type { Request, Response } from "express";
import { eq, and, gte, lt, ne, asc, desc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { appointmentsTable } from "../../db/schema/appointments.js";
import { customersTable } from "../../db/schema/customers.js";
import { servicesTable } from "../../db/schema/services.js";

const GetDashboard = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    // "Agora" na hora de parede do cliente (tz = minutos a leste de UTC)
    const tz = !isNaN(Number(req.query.tz)) ? Number(req.query.tz) : 0;
    const now = new Date(Date.now() + tz * 60000);

    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const startOfNextDay = new Date(startOfDay);
    startOfNextDay.setUTCDate(startOfNextDay.getUTCDate() + 1);

    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const startOfNextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    const baseSelect = {
      id: appointmentsTable.id,
      customerId: appointmentsTable.customerId,
      customerName: customersTable.name,
      customerPhone: customersTable.phone,
      serviceTitle: servicesTable.title,
      scheduledAt: appointmentsTable.scheduledAt,
      duration: appointmentsTable.duration,
      price: appointmentsTable.price,
      status: appointmentsTable.status,
    };

    // Agendamentos de hoje
    const todayAppointments = await db
      .select(baseSelect)
      .from(appointmentsTable)
      .leftJoin(customersTable, eq(appointmentsTable.customerId, customersTable.id))
      .leftJoin(servicesTable, eq(appointmentsTable.serviceId, servicesTable.id))
      .where(
        and(
          eq(appointmentsTable.userId, userId),
          gte(appointmentsTable.scheduledAt, startOfDay),
          lt(appointmentsTable.scheduledAt, startOfNextDay)
        )
      );

    const atendimentosHoje = {
      total: todayAppointments.length,
      realizados: todayAppointments.filter((a) => a.status === "completed").length,
      pendentes: todayAppointments.filter((a) =>
        ["scheduled", "confirmed"].includes(a.status)
      ).length,
    };

    // Agendamentos do mês
    const monthAppointments = await db
      .select({
        id: appointmentsTable.id,
        price: appointmentsTable.price,
        status: appointmentsTable.status,
      })
      .from(appointmentsTable)
      .where(
        and(
          eq(appointmentsTable.userId, userId),
          gte(appointmentsTable.scheduledAt, startOfMonth),
          lt(appointmentsTable.scheduledAt, startOfNextMonth)
        )
      );

    const atendimentosMes = monthAppointments.length;
    const receitaMes = monthAppointments
      .filter((a) => a.status === "completed")
      .reduce((sum, a) => sum + Number(a.price), 0);

    // Próximo agendamento (futuro, não cancelado)
    const [proximo] = await db
      .select(baseSelect)
      .from(appointmentsTable)
      .leftJoin(customersTable, eq(appointmentsTable.customerId, customersTable.id))
      .leftJoin(servicesTable, eq(appointmentsTable.serviceId, servicesTable.id))
      .where(
        and(
          eq(appointmentsTable.userId, userId),
          gte(appointmentsTable.scheduledAt, now),
          ne(appointmentsTable.status, "cancelled"),
          ne(appointmentsTable.status, "no_show")
        )
      )
      .orderBy(asc(appointmentsTable.scheduledAt))
      .limit(1);

    // Últimos atendimentos concluídos hoje
    const ultimos = await db
      .select(baseSelect)
      .from(appointmentsTable)
      .leftJoin(customersTable, eq(appointmentsTable.customerId, customersTable.id))
      .leftJoin(servicesTable, eq(appointmentsTable.serviceId, servicesTable.id))
      .where(
        and(
          eq(appointmentsTable.userId, userId),
          eq(appointmentsTable.status, "completed"),
          gte(appointmentsTable.scheduledAt, startOfDay),
          lt(appointmentsTable.scheduledAt, startOfNextDay)
        )
      )
      .orderBy(desc(appointmentsTable.scheduledAt))
      .limit(5);

    const formatAtendimento = (a: (typeof todayAppointments)[number]) => ({
      id: a.id,
      cliente: a.customerName ?? "Cliente",
      servico: a.serviceTitle ?? "Serviço",
      horario: new Date(a.scheduledAt).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC", // hora de parede: exibe exatamente o que foi agendado
      }),
      valor: Number(a.price),
      status:
        a.status === "completed"
          ? "realizado"
          : a.status === "cancelled" || a.status === "no_show"
          ? "cancelado"
          : "pendente",
      telefone: a.customerPhone ?? undefined,
    });

    return res.status(200).json({
      atendimentosHoje,
      atendimentosMes,
      receitaMes,
      horariosLivres: [],
      proximoAtendimento: proximo ? formatAtendimento(proximo) : null,
      ultimosAtendimentos: ultimos.map(formatAtendimento),
    });
  } catch (error) {
    console.error("ERRO DASHBOARD:", error);
    return res.status(500).json({ error: "Erro ao buscar dashboard" });
  }
};

export default GetDashboard;
