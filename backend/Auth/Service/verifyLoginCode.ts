// services/verifyLoginCode.ts — segunda etapa do login (2FA)
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { usersTable } from "../../db/schema/users.js";
import { verifyCode } from "../../Services/Email/authCode.js";

interface PendingLoginPayload {
  id: number;
  type: string;
}

const VerifyLoginCode = async (req: Request, res: Response) => {
  try {
    const { pendingToken, code } = req.body as { pendingToken?: string; code?: string };

    if (!pendingToken || !code) {
      return res.status(400).json({ message: "Token e código são obrigatórios" });
    }

    let payload: PendingLoginPayload;
    try {
      payload = jwt.verify(pendingToken, process.env.JWT_SECRET || "default_secret_key") as PendingLoginPayload;
    } catch {
      return res.status(401).json({ message: "Sessão de login expirada, faça login novamente" });
    }

    if (payload.type !== "pending_login") {
      return res.status(401).json({ message: "Token inválido" });
    }

    const isValid = await verifyCode(payload.id, "login", code);
    if (!isValid) {
      return res.status(401).json({ message: "Código inválido ou expirado" });
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.id)).limit(1);
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    await db.update(usersTable).set({ lastVerifiedAt: new Date() }).where(eq(usersTable.id, user.id));

    const token = jwt.sign(
      { id: user.id, name: user.name, document: user.document, accountType: user.accountType },
      process.env.JWT_SECRET || "default_secret_key",
      { expiresIn: "1d" }
    );

    return res.status(200).json({
      message: "Login realizado com sucesso",
      token,
      user: {
        id: user.id,
        name: user.name,
        document: user.document,
        accountType: user.accountType,
        homeService: user.homeService,
        businessType: user.businessType,
        aiStyle: user.aiStyle,
        customAiStyle: user.customAiStyle,
        privacyAccepted: user.privacyAccepted,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Erro ao verificar código de login:", error);
    return res.status(500).json({ message: "Erro interno ao verificar código" });
  }
};

export default VerifyLoginCode;
