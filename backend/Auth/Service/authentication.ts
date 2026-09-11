// services/authentication.ts
import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { usersTable } from "../../db/schema/users.js";
import { generateAndSendCode } from "../../Services/Email/authCode.js";
import { config } from "dotenv";
config({ path: "../.env" });

interface LoginBody {
  email: string;
  password: string;
}

// Mesma validade do JWT de sessão emitido abaixo ("1d") — enquanto o login
// anterior ainda estaria dentro dessa janela, não pede o código de novo.
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

const Authentication = async (req: Request<{}, {}, LoginBody>, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email e senha são obrigatórios",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, cleanEmail))
      .limit(1);


    if (!users || users.length === 0 || !users[0]) {
      return res.status(401).json({
        message: "Email ou senha inválidos",
      });
    }

    const user = users[0];

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Email ou senha inválidos",
      });
    }

    const issueDirectLogin = () => {
      const token = jwt.sign(
        { id: user.id, name: user.name, document: user.document, accountType: user.accountType, role: user.role },
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
          role: user.role,
          homeService: user.homeService,
          businessType: user.businessType,
          aiStyle: user.aiStyle,
          customAiStyle: user.customAiStyle,
          privacyAccepted: user.privacyAccepted,
          createdAt: user.createdAt,
        },
      });
    };

    // O login agora é sempre por email (achamos o usuário pelo email acima),
    // então user.email está sempre preenchido aqui.

    // Já confirmou o código recentemente (dentro da validade do JWT da
    // última vez) — não pede de novo, só quando esse período expirar.
    if (user.lastVerifiedAt && Date.now() - new Date(user.lastVerifiedAt).getTime() < SESSION_TTL_MS) {
      return issueDirectLogin();
    }

    // 2FA: gera e envia o código, retorna um token temporário (10 min) que
    // só serve para confirmar o código — não dá acesso a nenhuma rota.
    // Se o envio falhar (SMTP não configurado, fora do ar etc.), não trava
    // o acesso — cai para login direto, já que o código nunca chegaria mesmo.
    try {
      await generateAndSendCode(user.id, "login", cleanEmail, user.name);
    } catch (emailError) {
      console.warn("Falha ao enviar código de login, seguindo sem 2FA:", emailError);
      return issueDirectLogin();
    }

    const pendingToken = jwt.sign(
      { id: user.id, type: "pending_login" },
      process.env.JWT_SECRET || "default_secret_key",
      { expiresIn: "10m" }
    );

    return res.status(200).json({
      message: "Enviamos um código de verificação para o seu email",
      requiresCode: true,
      pendingToken,
    });

  } catch (error: any) {
    console.error("Erro na autenticação:", error);
    return res.status(500).json({
      message: "Erro interno ao realizar login",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export default Authentication;