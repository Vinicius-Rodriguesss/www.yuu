/**
 * Service: GetBusinessDetail
 *
 * Ficha de um negócio (user) para o super admin: dados cadastrais + contadores
 * e os últimos agendamentos. Somente leitura.
 */

import type { Request, Response } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { usersTable } from "../../db/schema/users.js";
import { addressesTable } from "../../db/schema/addresses.js";
import { appointmentsTable } from "../../db/schema/appointments.js";
import { customersTable } from "../../db/schema/customers.js";
import { servicesTable } from "../../db/schema/services.js";
import { productsTable } from "../../db/schema/products.js";
import { caixaSalesTable } from "../../db/schema/caixaSales.js";

const GetBusinessDetail = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const [user] = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        document: usersTable.document,
        email: usersTable.email,
        phone: usersTable.phone,
        role: usersTable.role,
        accountType: usersTable.accountType,
        businessType: usersTable.businessType,
        homeService: usersTable.homeService,
        publicSlug: usersTable.publicSlug,
        createdAt: usersTable.createdAt,
        lastVerifiedAt: usersTable.lastVerifiedAt,
      })
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "Negócio não encontrado" });
    }

    const [
      [address],
      [agend],
      [clientes],
      [servicos],
      [produtos],
      [vendas],
      ultimosAgendamentos,
    ] = await Promise.all([
      db
        .select({
          cep: addressesTable.cep,
          street: addressesTable.street,
          number: addressesTable.number,
          neighborhood: addressesTable.neighborhood,
          city: addressesTable.city,
          state: addressesTable.state,
        })
        .from(addressesTable)
        .where(eq(addressesTable.userId, id))
        .limit(1),
      db
        .select({
          total: sql<number>`count(*)::int`,
          concluidos: sql<number>`count(*) filter (where ${appointmentsTable.status} = 'completed')::int`,
          cancelados: sql<number>`count(*) filter (where ${appointmentsTable.status} in ('cancelled','no_show'))::int`,
          receita: sql<number>`coalesce(sum(${appointmentsTable.price}) filter (where ${appointmentsTable.status} = 'completed'), 0)::float`,
        })
        .from(appointmentsTable)
        .where(eq(appointmentsTable.userId, id)),
      db.select({ total: sql<number>`count(*)::int` }).from(customersTable).where(eq(customersTable.userId, id)),
      db
        .select({
          total: sql<number>`count(*)::int`,
          ativos: sql<number>`count(*) filter (where ${servicesTable.active})::int`,
        })
        .from(servicesTable)
        .where(eq(servicesTable.userId, id)),
      db
        .select({
          total: sql<number>`count(*)::int`,
          ativos: sql<number>`count(*) filter (where ${productsTable.active})::int`,
        })
        .from(productsTable)
        .where(eq(productsTable.userId, id)),
      db.select({ total: sql<number>`count(*)::int` }).from(caixaSalesTable).where(eq(caixaSalesTable.userId, id)),
      db
        .select({
          id: appointmentsTable.id,
          scheduledAt: appointmentsTable.scheduledAt,
          status: appointmentsTable.status,
          price: appointmentsTable.price,
          customerName: customersTable.name,
          serviceTitle: servicesTable.title,
        })
        .from(appointmentsTable)
        .leftJoin(customersTable, eq(appointmentsTable.customerId, customersTable.id))
        .leftJoin(servicesTable, eq(appointmentsTable.serviceId, servicesTable.id))
        .where(eq(appointmentsTable.userId, id))
        .orderBy(desc(appointmentsTable.scheduledAt))
        .limit(5),
    ]);

    return res.status(200).json({
      ...user,
      address: address ?? null,
      stats: {
        agendamentos: {
          total: agend?.total ?? 0,
          concluidos: agend?.concluidos ?? 0,
          cancelados: agend?.cancelados ?? 0,
        },
        receitaAtendimentos: agend?.receita ?? 0,
        clientes: clientes?.total ?? 0,
        servicos: { total: servicos?.total ?? 0, ativos: servicos?.ativos ?? 0 },
        produtos: { total: produtos?.total ?? 0, ativos: produtos?.ativos ?? 0 },
        vendasCaixa: vendas?.total ?? 0,
      },
      ultimosAgendamentos,
    });
  } catch (error) {
    console.error("ERRO ADMIN BUSINESS DETAIL:", error);
    return res.status(500).json({ error: "Erro ao carregar dados do negócio" });
  }
};

export default GetBusinessDetail;
