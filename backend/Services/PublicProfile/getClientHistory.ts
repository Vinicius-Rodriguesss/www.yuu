/**
 * Service: GetClientHistory
 *
 * GET /public/:slug/history — exige login do CLIENTE FINAL.
 * Retorna, para ESTE profissional (slug):
 * - appointments: todos os agendamentos já feitos pelo cliente com ele
 * - recommendedServices: os serviços que o cliente mais usou (contagem de
 *   agendamentos concluídos), do mais pedido pro menos, pra sugerir "quer o
 *   de sempre?" na hora de escolher o serviço.
 */
import type { Request, Response } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { usersTable } from "../../db/schema/users.js";
import { customersTable } from "../../db/schema/customers.js";
import { appointmentsTable } from "../../db/schema/appointments.js";
import { servicesTable } from "../../db/schema/services.js";

const MAX_RECOMMENDATIONS = 3;

const GetClientHistory = async (req: Request<{ slug: string }>, res: Response) => {
  try {
    const { slug } = req.params;
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
      // Cliente ainda nunca agendou com este profissional
      return res.status(200).json({ appointments: [], recommendedServices: [] });
    }

    const appointments = await db
      .select({
        id: appointmentsTable.id,
        scheduledAt: appointmentsTable.scheduledAt,
        duration: appointmentsTable.duration,
        price: appointmentsTable.price,
        status: appointmentsTable.status,
        isHomeService: appointmentsTable.isHomeService,
        travelCost: appointmentsTable.travelCost,
        serviceId: appointmentsTable.serviceId,
        serviceTitle: servicesTable.title,
      })
      .from(appointmentsTable)
      .innerJoin(servicesTable, eq(appointmentsTable.serviceId, servicesTable.id))
      .where(eq(appointmentsTable.customerId, customer.id))
      .orderBy(desc(appointmentsTable.scheduledAt));

    // Serviços mais usados: conta quantas vezes cada serviço (ainda ativo)
    // aparece nos agendamentos deste cliente, do mais pedido pro menos.
    const recommendedServices = await db
      .select({
        id: servicesTable.id,
        title: servicesTable.title,
        description: servicesTable.description,
        duration: servicesTable.duration,
        price: servicesTable.price,
        category: servicesTable.category,
        timesBooked: sql<number>`count(${appointmentsTable.id})`.mapWith(Number),
      })
      .from(appointmentsTable)
      .innerJoin(servicesTable, eq(appointmentsTable.serviceId, servicesTable.id))
      .where(and(eq(appointmentsTable.customerId, customer.id), eq(servicesTable.active, true)))
      .groupBy(servicesTable.id)
      .orderBy(desc(sql`count(${appointmentsTable.id})`))
      .limit(MAX_RECOMMENDATIONS);

    return res.status(200).json({ appointments, recommendedServices });
  } catch (error) {
    console.error("ERRO GET CLIENT HISTORY:", error);
    return res.status(500).json({ error: "Erro ao buscar histórico" });
  }
};

export default GetClientHistory;
