// services/signup.ts
import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm"; // 
import { db } from "../db/index.js";
import { usersTable } from "../db/schema/users.js";
import { addressesTable } from "../db/schema/addresses.js";
import { workSchedulesTable } from "../db/schema/workSchedules.js";
import { workScheduleDaysTable } from "../db/schema/workScheduleDays.js";

// Estrutura esperada no body da requisição
interface SignupBody {
  name: string;
  document: string;
  password: string;

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
      return res.status(409).json({
        message: "Registro duplicado. Este dado já existe no sistema.",
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