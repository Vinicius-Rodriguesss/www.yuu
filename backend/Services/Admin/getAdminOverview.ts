// Services/Admin/getAdminOverview.ts
import type { Request, Response } from "express";
import { sql, desc, gte } from "drizzle-orm";
import { db } from "../../db/index.js";
import { usersTable } from "../../db/schema/users.js";
import { subscriptionsTable } from "../../db/schema/subscriptions.js";
import { isSmtpConfigured } from "../Email/mailer.js";
import { stripe } from "../Stripe/client.js";

const GetAdminOverview = async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday.getTime() - 6 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let dbHealthy = true;
    try {
      await db.execute(sql`SELECT 1`);
    } catch {
      dbHealthy = false;
    }

    const [totalRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(usersTable);

    const [todayRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(usersTable)
      .where(gte(usersTable.createdAt, startOfToday));

    const [weekRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(usersTable)
      .where(gte(usersTable.createdAt, startOfWeek));

    const [monthRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(usersTable)
      .where(gte(usersTable.createdAt, startOfMonth));

    const totalUsers = totalRow?.count ?? 0;
    const newToday = todayRow?.count ?? 0;
    const newThisWeek = weekRow?.count ?? 0;
    const newThisMonth = monthRow?.count ?? 0;

    const byAccountType = await db
      .select({ accountType: usersTable.accountType, count: sql<number>`count(*)::int` })
      .from(usersTable)
      .groupBy(usersTable.accountType);

    const latestUsers = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        accountType: usersTable.accountType,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .orderBy(desc(usersTable.createdAt))
      .limit(10);

    const subscriptionsByStatus = await db
      .select({ status: subscriptionsTable.status, count: sql<number>`count(*)::int` })
      .from(subscriptionsTable)
      .groupBy(subscriptionsTable.status);

    return res.status(200).json({
      health: {
        database: dbHealthy,
        smtp: isSmtpConfigured(),
        stripe: Boolean(stripe),
      },
      users: {
        total: totalUsers,
        newToday,
        newThisWeek,
        newThisMonth,
        byAccountType,
        latest: latestUsers,
      },
      subscriptions: {
        byStatus: subscriptionsByStatus,
      },
    });
  } catch (error) {
    console.error("ERRO ADMIN OVERVIEW:", error);
    return res.status(500).json({ error: "Erro ao carregar visão geral" });
  }
};

export default GetAdminOverview;
