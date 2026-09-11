// Services/Password/resetPassword.ts
import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { usersTable } from "../../db/schema/users.js";
import { verifyCode } from "../Email/authCode.js";

const SALT_ROUNDS = 10;

const ResetPassword = async (req: Request, res: Response) => {
  try {
    const { email, code, newPassword } = req.body as {
      email?: string;
      code?: string;
      newPassword?: string;
    };

    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: "Email, código e nova senha são obrigatórios" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "A senha deve ter pelo menos 8 caracteres" });
    }

    const cleanEmail = email.trim().toLowerCase();

    const [user] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, cleanEmail))
      .limit(1);

    if (!user) {
      return res.status(400).json({ error: "Código inválido ou expirado" });
    }

    const isValid = await verifyCode(user.id, "password_reset", code);
    if (!isValid) {
      return res.status(400).json({ error: "Código inválido ou expirado" });
    }

    const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await db.update(usersTable).set({ password: hashed }).where(eq(usersTable.id, user.id));

    return res.status(200).json({ message: "Senha redefinida com sucesso" });
  } catch (error) {
    console.error("ERRO RESET PASSWORD:", error);
    return res.status(500).json({ error: "Erro ao redefinir senha" });
  }
};

export default ResetPassword;
