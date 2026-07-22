// Services/Password/requestPasswordChangeCode.ts — usuário autenticado pede o código pra trocar a própria senha
import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { usersTable } from "../../db/schema/users.js";
import { generateAndSendCode } from "../Email/authCode.js";
import { SmtpNotConfiguredError } from "../Email/mailer.js";

const RequestPasswordChangeCode = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const [user] = await db
      .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }
    if (!user.email) {
      return res.status(400).json({ error: "Cadastre um email em Configurações antes de trocar a senha" });
    }

    await generateAndSendCode(user.id, "password_change", user.email, user.name);

    return res.status(200).json({ message: "Código enviado para o seu email" });
  } catch (error) {
    if (error instanceof SmtpNotConfiguredError) {
      return res.status(503).json({ error: "Envio de email não configurado. Contate o suporte." });
    }
    console.error("ERRO REQUEST PASSWORD CHANGE CODE:", error);
    return res.status(500).json({ error: "Erro ao enviar código" });
  }
};

export default RequestPasswordChangeCode;
