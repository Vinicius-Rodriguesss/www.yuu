/**
 * Service: ListBusinesses
 *
 * Lista paginada de todos os negócios (users com role "owner") para a tabela
 * do super admin. Suporta busca por nome / documento / email.
 */

import type { Request, Response } from "express";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { usersTable } from "../../db/schema/users.js";
import { appointmentsTable } from "../../db/schema/appointments.js";
import { customersTable } from "../../db/schema/customers.js";

const ListBusinesses = async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q ?? "").trim();
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const filters = [eq(usersTable.role, "owner")];
    if (q) {
      const like = `%${q}%`;
      filters.push(
        or(
          ilike(usersTable.name, like),
          ilike(usersTable.document, like),
          ilike(usersTable.email, like),
          ilike(usersTable.businessType, like)
        )!
      );
    }
    const where = and(...filters);

    const [rows, [totalRow]] = await Promise.all([
      db
        .select({
          id: usersTable.id,
          name: usersTable.name,
          document: usersTable.document,
          email: usersTable.email,
          phone: usersTable.phone,
          accountType: usersTable.accountType,
          businessType: usersTable.businessType,
          publicSlug: usersTable.publicSlug,
          createdAt: usersTable.createdAt,
          appointmentsCount: sql<number>`count(distinct ${appointmentsTable.id})::int`,
          customersCount: sql<number>`count(distinct ${customersTable.id})::int`,
          lastAppointmentAt: sql<string | null>`max(${appointmentsTable.scheduledAt})`,
        })
        .from(usersTable)
        .leftJoin(appointmentsTable, eq(appointmentsTable.userId, usersTable.id))
        .leftJoin(customersTable, eq(customersTable.userId, usersTable.id))
        .where(where)
        .groupBy(usersTable.id)
        .orderBy(desc(usersTable.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: sql<number>`count(*)::int` }).from(usersTable).where(where),
    ]);

    return res.status(200).json({
      total: totalRow?.total ?? 0,
      limit,
      offset,
      businesses: rows,
    });
  } catch (error) {
    console.error("ERRO ADMIN LIST BUSINESSES:", error);
    return res.status(500).json({ error: "Erro ao listar negócios" });
  }
};

export default ListBusinesses;
