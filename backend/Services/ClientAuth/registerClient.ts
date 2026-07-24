/**
 * Service: RegisterClient
 *
 * POST /client/register — cadastro rápido do CLIENTE FINAL (conta global).
 * Coleta apenas o mínimo necessário (LGPD): nome, CPF, celular e senha.
 * O aceite LGPD é obrigatório e fica registrado com data/hora.
 */
import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq, or } from "drizzle-orm";
import { db } from "../../db/index.js";
import { clientAccountsTable } from "../../db/schema/clientAccounts.js";

interface RegisterClientBody {
  name?: string;
  cpf?: string;
  phone?: string;
  email?: string; // opcional — usado para confirmação e lembrete de agendamento
  password?: string;
  lgpdAccepted?: boolean;
}

const onlyDigits = (v: string) => v.replace(/\D/g, "");

const isValidCPF = (cpf: string): boolean => {
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]!) * (10 - i);
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(cpf[9]!)) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]!) * (11 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  return remainder === parseInt(cpf[10]!);
};

export const signClientToken = (client: { id: number; name: string }) =>
  jwt.sign(
    { id: client.id, name: client.name, type: "client" },
    process.env.JWT_SECRET || "default_secret_key",
    { expiresIn: "7d" }
  );

export const clientPublicData = (client: {
  id: number;
  name: string;
  cpf: string;
  phone: string;
  cep: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
}) => ({
  id: client.id,
  name: client.name,
  cpf: client.cpf,
  phone: client.phone,
  address: client.cep
    ? {
        cep: client.cep,
        street: client.street ?? "",
        number: client.number ?? "",
        complement: client.complement ?? "",
        neighborhood: client.neighborhood ?? "",
        city: client.city ?? "",
        state: client.state ?? "",
      }
    : null,
});

const RegisterClient = async (req: Request<{}, {}, RegisterClientBody>, res: Response) => {
  try {
    const { name, cpf, phone, email, password, lgpdAccepted } = req.body;

    if (!name?.trim() || !cpf || !phone || !password) {
      return res.status(400).json({ error: "Nome, CPF, celular e senha são obrigatórios" });
    }

    if (!lgpdAccepted) {
      return res.status(400).json({ error: "É necessário aceitar a Política de Privacidade (LGPD)" });
    }

    const cleanCpf = onlyDigits(cpf);
    const cleanPhone = onlyDigits(phone);

    if (!isValidCPF(cleanCpf)) {
      return res.status(400).json({ error: "CPF inválido" });
    }
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      return res.status(400).json({ error: "Celular inválido" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres" });
    }
    const cleanEmail = email?.trim().toLowerCase() || null;
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: "Email inválido" });
    }

    const [existing] = await db
      .select({ id: clientAccountsTable.id, cpf: clientAccountsTable.cpf })
      .from(clientAccountsTable)
      .where(or(eq(clientAccountsTable.cpf, cleanCpf), eq(clientAccountsTable.phone, cleanPhone)))
      .limit(1);

    if (existing) {
      const field = existing.cpf === cleanCpf ? "CPF" : "celular";
      return res.status(409).json({ error: `Já existe uma conta com este ${field}. Faça login.` });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [created] = await db
      .insert(clientAccountsTable)
      .values({
        name: name.trim(),
        cpf: cleanCpf,
        phone: cleanPhone,
        email: cleanEmail,
        password: hashedPassword,
        lgpdAcceptedAt: new Date(),
      })
      .returning();

    if (!created) {
      throw new Error("Não foi possível criar a conta");
    }

    const token = signClientToken(created);
    return res.status(201).json({ token, client: clientPublicData(created) });
  } catch (error) {
    console.error("ERRO REGISTER CLIENT:", error);
    return res.status(500).json({ error: "Erro ao criar conta" });
  }
};

export default RegisterClient;
