// Services/Setup/getSetupStatus.ts
// Rota pública: diz se o sistema ainda não tem nenhum super admin (banco
// "zerado" nesse sentido). O front usa isso pra decidir se mostra a tela de
// login normal ou o assistente de criação do primeiro super admin.
import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { usersTable } from "../../db/schema/users.js";

const GetSetupStatus = async (_req: Request, res: Response) => {
  try {
    const [superAdmin] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.role, "super_admin"))
      .limit(1);

    return res.status(200).json({ needsSetup: !superAdmin });
  } catch (error) {
    console.error("ERRO GET SETUP STATUS:", error);
    return res.status(500).json({ error: "Erro ao verificar status do sistema" });
  }
};

export default GetSetupStatus;
