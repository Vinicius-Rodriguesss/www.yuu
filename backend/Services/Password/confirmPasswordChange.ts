// Services/Password/confirmPasswordChange.ts
import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { usersTable } from "../../db/schema/users.js";
import { verifyCode } from "../Email/authCode.js";

const SALT_ROUNDS = 10;

const ConfirmPasswordChange = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { code, newPassword } = req.body as { code?: string; newPassword?: string };

    if (!code || !newPassword) {
      return res.status(400).json({ error: "Código e nova senha são obrigatórios" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "A senha deve ter pelo menos 8 caracteres" });
    }

    const isValid = await verifyCode(userId, "password_change", code);
    if (!isValid) {
      return res.status(400).json({ error: "Código inválido ou expirado" });
    }

    const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await db.update(usersTable).set({ password: hashed }).where(eq(usersTable.id, userId));

    return res.status(200).json({ message: "Senha alterada com sucesso" });
  } catch (error) {
    console.error("ERRO CONFIRM PASSWORD CHANGE:", error);
    return res.status(500).json({ error: "Erro ao alterar senha" });
  }
};

export default ConfirmPasswordChange;
