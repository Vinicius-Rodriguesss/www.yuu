// Services/Setup/createSuperAdmin.ts
// Rota pública, mas autolimitada: só cria o super admin enquanto NENHUM outro
// existir. Depois do primeiro, sempre responde 403 — a partir daí, promover
// alguém a super_admin volta a ser manual (UPDATE no banco).
import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { usersTable } from "../../db/schema/users.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SALT_ROUNDS = 10;

const isStrongPassword = (password: string) =>
  password.length >= 8 &&
  /[A-Z]/.test(password) &&
  /[a-z]/.test(password) &&
  /[0-9]/.test(password) &&
  /[!@#$%^&*(),.?":{}|<>]/.test(password);

const CreateSuperAdmin = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body as { name?: string; email?: string; password?: string };

    const [existingSuperAdmin] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.role, "super_admin"))
      .limit(1);

    if (existingSuperAdmin) {
      return res.status(403).json({ error: "Já existe um super admin. Peça para ele te promover." });
    }

    const cleanEmail = String(email || "").trim().toLowerCase();
    if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
      return res.status(400).json({ error: "Informe um email válido" });
    }
    if (!password || !isStrongPassword(password)) {
      return res.status(400).json({
        error: "A senha precisa de 8+ caracteres, com maiúscula, minúscula, número e símbolo",
      });
    }

    const [emailOwner] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, cleanEmail))
      .limit(1);
    if (emailOwner) {
      return res.status(409).json({ error: "Este email já está em uso" });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // O super admin é um operador da plataforma, não um negócio — os campos
    // de negócio (document, accountType, businessType, aiStyle) não se
    // aplicam a ele e recebem placeholders; ele nunca passa pelo dashboard
    // de um profissional, só pela área /admin.
    const [created] = await db
      .insert(usersTable)
      .values({
        name: name?.trim() || "Super Admin",
        document: `SA-${randomBytes(8).toString("hex")}`,
        password: hashedPassword,
        role: "super_admin",
        email: cleanEmail,
        accountType: "professional",
        homeService: false,
        businessType: "Administração da plataforma",
        aiStyle: "direto",
        privacyAccepted: true,
        lastVerifiedAt: new Date(), // evita pedir 2FA logo no primeiro login
      })
      .returning();

    if (!created) {
      throw new Error("Não foi possível criar o super admin");
    }

    const token = jwt.sign(
      { id: created.id, name: created.name, document: created.document, accountType: created.accountType, role: created.role },
      process.env.JWT_SECRET || "default_secret_key",
      { expiresIn: "1d" }
    );

    return res.status(201).json({
      message: "Super admin criado com sucesso",
      token,
      user: { id: created.id, name: created.name, role: created.role },
    });
  } catch (error: any) {
    if (error?.code === "23505") {
      return res.status(409).json({ error: "Este email já está em uso" });
    }
    console.error("ERRO CREATE SUPER ADMIN:", error);
    return res.status(500).json({ error: "Erro ao criar super admin" });
  }
};

export default CreateSuperAdmin;
