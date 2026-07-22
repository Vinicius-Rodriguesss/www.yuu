// services/signup.ts
import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm"; // 
import { db } from "../db/index.js";
import { usersTable } from "../db/schema/users.js";
import { addressesTable } from "../db/schema/addresses.js";
import { workSchedulesTable } from "../db/schema/workSchedules.js";
import { workScheduleDaysTable } from "../db/schema/workScheduleDays.js";
import { welcomeEmailTemplate } from "./Email/templates.js";
import { sendMail } from "./Email/mailer.js";

// Estrutura esperada no body da requisição
interface SignupBody {
  name: string;
  document: string;
  password: string;
  email: string;

  address: {
    cep: string;  
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
  };

  accountType: "establishment" | "professional";
  homeService: boolean;
  businessType: string;

  aiStyle: "direto" | "amigavel" | "profissional";
  customAiStyle?: string;

  workSchedule: {
    name?: string;
    days: {
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      appointmentInterval: number;
      isActive?: boolean;
    }[];
  };

  privacyAccepted: boolean;
}

// Controller responsável pelo cadastro
const Signup = async (req: Request<{}, {}, SignupBody>, res: Response) => {
  try {
    const {
      name,
      document,
      password,
      email,
      address,
      accountType,
      homeService,
      businessType,
      aiStyle,
      customAiStyle,
      workSchedule,
      privacyAccepted,
    } = req.body;

    // Validação básica
    if (!name || !document || !password) {
      return res.status(400).json({
        message: "Nome, documento e senha são obrigatórios",
      });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        message: "Email válido é obrigatório (usado para login e recuperação de senha)",
      });
    }
    const cleanEmail = email.trim().toLowerCase();

    if (!privacyAccepted) {
      return res.status(400).json({
        message: "É necessário aceitar os termos de privacidade",
      });
    }

    // Validação da jornada de trabalho
    if (!workSchedule || !Array.isArray(workSchedule.days) || workSchedule.days.length === 0) {
      return res.status(400).json({
        message: "Informe pelo menos um dia de trabalho",
      });
    }

    // Verifica se o documento já existe (USANDO eq CORRETAMENTE)
    const existingUser = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.document, document)) // 🔥 SINTAXE CORRETA: eq(coluna, valor)
      .limit(1);

    if (existingUser.length > 0) {
      return res.status(409).json({
        message: "CPF/CNPJ já cadastrado no sistema",
      });
    }

    // Verifica se o email já está em uso
    const existingEmail = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, cleanEmail))
      .limit(1);

    if (existingEmail.length > 0) {
      return res.status(409).json({
        message: "Este email já está cadastrado no sistema",
      });
    }

    // Criptografa senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Transaction garante consistência
    const result = await db.transaction(async (tx) => {
      // 1. Criando usuário
      const [user] = await tx
        .insert(usersTable)
        .values({
          name,
          document,
          password: hashedPassword,
          email: cleanEmail,
          accountType,
          homeService,
          businessType,
          aiStyle,
          customAiStyle: customAiStyle || null,
          privacyAccepted,
        })
        .returning();

      if (!user) {
        throw new Error("Usuário não foi criado");
      }

      // 2. Criando endereço vinculado
      await tx.insert(addressesTable).values({
        userId: user.id,
        cep: address.cep,
        street: address.street,
        number: address.number,
        complement: address.complement || null,
        neighborhood: address.neighborhood,
        city: address.city,
        state: address.state,
      });

      // 3. Criando jornada de trabalho (template)
      const [schedule] = await tx
        .insert(workSchedulesTable)
        .values({
          userId: user.id,
          name: workSchedule.name || "Jornada Padrão",
          isActive: true,
        })
        .returning();

      // 4. Criando os dias da jornada
      const daysToInsert = workSchedule.days.map((day) => ({
        workScheduleId: schedule!.id,
        dayOfWeek: day.dayOfWeek,
        startTime: day.startTime,
        endTime: day.endTime,
        appointmentInterval: day.appointmentInterval,
        isActive: day.isActive ?? true,
      }));

      await tx.insert(workScheduleDaysTable).values(daysToInsert);

      return user;
    });

    // Email de boas-vindas não bloqueia o cadastro se falhar
    try {
      const { subject, html } = welcomeEmailTemplate(result.name);
      await sendMail(cleanEmail, subject, html);
    } catch (emailError) {
      console.warn("Falha ao enviar email de boas-vindas:", emailError);
    }

    return res.status(201).json({
      message: "Usuário criado com sucesso",
      user: {
        id: result.id,
        name: result.name,
        document: result.document,
        accountType: result.accountType,
        businessType: result.businessType,
      },
    });
  } catch (error: any) {
    console.error("Erro no cadastro:", error);

    // Erro de chave duplicada (PostgreSQL)
    if (error?.code === "23505") {
      const isEmailConflict = String(error?.constraint || "").includes("email");
      return res.status(409).json({
        message: isEmailConflict
          ? "Este email já está cadastrado no sistema"
          : "Registro duplicado. Este dado já existe no sistema.",
        detail: error?.detail,
        constraint: error?.constraint,
      });
    }

    return res.status(500).json({
      message: "Erro interno ao criar usuário",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export default Signup;