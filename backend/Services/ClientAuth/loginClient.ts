/**
 * Service: LoginClient
 *
 * POST /client/login — login do CLIENTE FINAL usando CPF ou celular + senha.
 */
import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { eq, or } from "drizzle-orm";
import { db } from "../../db/index.js";
import { clientAccountsTable } from "../../db/schema/clientAccounts.js";
import { signClientToken, clientPublicData } from "./registerClient.js";

interface LoginClientBody {
  login?: string; // CPF ou celular
  password?: string;
}

const onlyDigits = (v: string) => v.replace(/\D/g, "");

const LoginClient = async (req: Request<{}, {}, LoginClientBody>, res: Response) => {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({ error: "Informe CPF ou celular e a senha" });
    }

    const clean = onlyDigits(login);
    if (!clean) {
      return res.status(400).json({ error: "CPF ou celular inválido" });
    }

    const [client] = await db
      .select()
      .from(clientAccountsTable)
      .where(or(eq(clientAccountsTable.cpf, clean), eq(clientAccountsTable.phone, clean)))
      .limit(1);

    if (!client || !(await bcrypt.compare(password, client.password))) {
      return res.status(401).json({ error: "CPF/celular ou senha incorretos" });
    }

    const token = signClientToken(client);
    return res.status(200).json({ token, client: clientPublicData(client) });
  } catch (error) {
    console.error("ERRO LOGIN CLIENT:", error);
    return res.status(500).json({ error: "Erro ao fazer login" });
  }
};

export default LoginClient;
