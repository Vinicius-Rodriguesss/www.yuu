// Services/Password/forgotPassword.ts
import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { usersTable } from "../../db/schema/users.js";
import { generateAndSendCode } from "../Email/authCode.js";

const GENERIC_MESSAGE = "Se o email existir na nossa base, enviamos um código para redefinir a senha.";

const ForgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body as { email?: string };
    if (!email) {
      return res.status(400).json({ error: "Email é obrigatório" });
    }

    const cleanEmail = email.trim().toLowerCase();

    const [user] = await db
      .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.email, cleanEmail))
      .limit(1);

    // Sempre responde a mesma mensagem genérica (não revela se o email existe)
    if (user?.email) {
      await generateAndSendCode(user.id, "password_reset", user.email, user.name).catch((err) =>
        console.warn("Falha ao enviar código de recuperação:", err)
      );
    }

    return res.status(200).json({ message: GENERIC_MESSAGE });
  } catch (error) {
    console.error("ERRO FORGOT PASSWORD:", error);
    return res.status(500).json({ error: "Erro ao processar solicitação" });
  }
};

export default ForgotPassword;
