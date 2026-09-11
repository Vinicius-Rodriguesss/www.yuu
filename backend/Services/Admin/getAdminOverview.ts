/**
 * Service: GetAdminOverview
 *
 * Números agregados da plataforma inteira, para a tela do super admin.
 * Não é filtrado por usuário — soma todos os negócios.
 */

import type { Request, Response } from "express";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { usersTable } from "../../db/schema/users.js";
import { appointmentsTable } from "../../db/schema/appointments.js";
import { customersTable } from "../../db/schema/customers.js";
import { caixaSalesTable } from "../../db/schema/caixaSales.js";
import { caixaEntriesTable } from "../../db/schema/caixaEntries.js";

const GetAdminOverview = async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const trintaDiasAtras = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      [negocios],
      [novos30d],
      [agendamentos],
      [receitaAtend],
      [clientes],
      [entradasCaixa],
      [descontosCaixa],
    ] = await Promise.all([
      db
        .select({
          total: sql<number>`count(*)::int`,
          estabelecimentos: sql<number>`count(*) filter (where ${usersTable.accountType} = 'establishment')::int`,
          profissionais: sql<number>`count(*) filter (where ${usersTable.accountType} = 'professional')::int`,
        })
        .from(usersTable)
        .where(eq(usersTable.role, "owner")),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(usersTable)
        .where(and(eq(usersTable.role, "owner"), gte(usersTable.createdAt, trintaDiasAtras))),
      db
        .select({
          total: sql<number>`count(*)::int`,
          concluidos: sql<number>`count(*) filter (where ${appointmentsTable.status} = 'completed')::int`,
          cancelados: sql<number>`count(*) filter (where ${appointmentsTable.status} in ('cancelled','no_show'))::int`,
        })
        .from(appointmentsTable),
      db
        .select({ total: sql<number>`coalesce(sum(${appointmentsTable.price}), 0)::float` })
        .from(appointmentsTable)
        .where(eq(appointmentsTable.status, "completed")),
      db.select({ total: sql<number>`count(*)::int` }).from(customersTable),
      db
        .select({ total: sql<number>`coalesce(sum(${caixaEntriesTable.amount}), 0)::float` })
        .from(caixaEntriesTable),
      db
        .select({ total: sql<number>`coalesce(sum(${caixaSalesTable.discount}), 0)::float` })
        .from(caixaSalesTable),
    ]);

    const receitaCaixa = Math.max(0, (entradasCaixa?.total ?? 0) - (descontosCaixa?.total ?? 0));

    return res.status(200).json({
      negocios: {
        total: negocios?.total ?? 0,
        estabelecimentos: negocios?.estabelecimentos ?? 0,
        profissionais: negocios?.profissionais ?? 0,
        novos30d: novos30d?.total ?? 0,
      },
      agendamentos: {
        total: agendamentos?.total ?? 0,
        concluidos: agendamentos?.concluidos ?? 0,
        cancelados: agendamentos?.cancelados ?? 0,
      },
      clientes: clientes?.total ?? 0,
      receita: {
        atendimentos: receitaAtend?.total ?? 0,
        caixa: receitaCaixa,
        total: (receitaAtend?.total ?? 0) + receitaCaixa,
      },
    });
  } catch (error) {
    console.error("ERRO ADMIN OVERVIEW:", error);
    return res.status(500).json({ error: "Erro ao carregar visão geral da plataforma" });
  }
};

export default GetAdminOverview;
