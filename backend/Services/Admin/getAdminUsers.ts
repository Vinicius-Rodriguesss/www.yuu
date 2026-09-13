// Services/Admin/getAdminUsers.ts
import type { Request, Response } from "express";
import { desc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { usersTable } from "../../db/schema/users.js";
import { subscriptionsTable } from "../../db/schema/subscriptions.js";

const GetAdminUsers = async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        document: usersTable.document,
        accountType: usersTable.accountType,
        role: usersTable.role,
        createdAt: usersTable.createdAt,
        subscriptionStatus: subscriptionsTable.status,
        currentPeriodEnd: subscriptionsTable.currentPeriodEnd,
      })
      .from(usersTable)
      .leftJoin(subscriptionsTable, eq(subscriptionsTable.userId, usersTable.id))
      .orderBy(desc(usersTable.createdAt));

    return res.status(200).json({
      users: rows.map((u) => ({
        ...u,
        subscriptionStatus: u.subscriptionStatus ?? "sem_assinatura",
      })),
    });
  } catch (error) {
    console.error("ERRO ADMIN USERS:", error);
    return res.status(500).json({ error: "Erro ao carregar usuários" });
  }
};

export default GetAdminUsers;
