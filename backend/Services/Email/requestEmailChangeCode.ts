// Services/Email/requestEmailChangeCode.ts
// Usuário autenticado pede o código pra trocar o próprio email.
// O código vai para o NOVO endereço (prova de posse). Enquanto não confirmar,
// o email atual da conta continua valendo.
import type { Request, Response } from "express";
import { and, eq, ne } from "drizzle-orm";
import { db } from "../../db/index.js";
import { usersTable } from "../../db/schema/users.js";
import { generateAndSendCode } from "./authCode.js";
import { SmtpNotConfiguredError } from "./mailer.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RequestEmailChangeCode = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { newEmail } = req.body as { newEmail?: string };

    const clean = String(newEmail || "").trim().toLowerCase();
    if (!clean || !EMAIL_REGEX.test(clean)) {
      return res.status(400).json({ error: "Informe um email válido" });
    }

    const [user] = await db
      .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }
    if (user.email && user.email.toLowerCase() === clean) {
      return res.status(400).json({ error: "Este já é o seu email atual" });
    }

    const [emailOwner] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(and(eq(usersTable.email, clean), ne(usersTable.id, userId)))
      .limit(1);

    if (emailOwner) {
      return res.status(409).json({ error: "Este email já está em uso por outra conta" });
    }

    await db.update(usersTable).set({ pendingEmail: clean }).where(eq(usersTable.id, userId));
    await generateAndSendCode(user.id, "email_change", clean, user.name);

    return res.status(200).json({ message: "Código enviado para o novo email" });
  } catch (error) {
    if (error instanceof SmtpNotConfiguredError) {
      return res.status(503).json({ error: "Envio de email não configurado. Contate o suporte." });
    }
    console.error("ERRO REQUEST EMAIL CHANGE CODE:", error);
    return res.status(500).json({ error: "Erro ao enviar código" });
  }
};

export default RequestEmailChangeCode;
