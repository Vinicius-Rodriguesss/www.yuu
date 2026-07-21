// Services/UpdateSettings.ts
import type { Request, Response } from "express";
import { and, eq, ne } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "../db/index.js";
import { usersTable } from "../db/schema/users.js";
import { addressesTable } from "../db/schema/addresses.js";
import { workSchedulesTable } from "../db/schema/workSchedules.js";
import { workScheduleDaysTable } from "../db/schema/workScheduleDays.js";

const SALT_ROUNDS = 10;

const UpdateSettings = async (req: Request, res: Response) => {
 try {
  const userId = (req as any).userId;
  const {
   name,
   document,
   password,
   address,
   phone,
   accountType,
   homeService,
   businessType,
   aiStyle,
   customAiStyle,
   workSchedule,
   privacyAccepted,
   scheduleInterval,
   appointmentBuffer,
  } = req.body;

  const validIntervals = [5, 10, 15, 20, 30, 40, 60];
  if (scheduleInterval !== undefined && !validIntervals.includes(Number(scheduleInterval))) {
   return res.status(400).json({ error: "Intervalo da agenda inválido" });
  }
  if (
   appointmentBuffer !== undefined &&
   (isNaN(Number(appointmentBuffer)) || Number(appointmentBuffer) < 0 || Number(appointmentBuffer) > 240)
  ) {
   return res.status(400).json({ error: "Delay entre atendimentos inválido" });
  }

  if (!name || !document || !address || !accountType || !businessType || !aiStyle) {
   return res.status(400).json({ error: "Campos obrigatórios ausentes" });
  }
  if (
   !address.cep ||
   !address.street ||
   !address.number ||
   !address.neighborhood ||
   !address.city ||
   !address.state
  ) {
   return res.status(400).json({ error: "Endereço incompleto" });
  }

  // workSchedule.days agora é um array de dias (opcional na atualização)
  if (workSchedule && workSchedule.days && !Array.isArray(workSchedule.days)) {
   return res.status(400).json({ error: "Dias da jornada devem ser um array" });
  }

  const documentDigits = String(document).replace(/\D/g, "");

  // Garante que o CPF/CNPJ não pertence a outro usuário
  const [documentOwner] = await db
   .select({ id: usersTable.id })
   .from(usersTable)
   .where(and(eq(usersTable.document, documentDigits), ne(usersTable.id, userId)))
   .limit(1);

  if (documentOwner) {
   return res.status(409).json({ error: "Este CPF/CNPJ já está em uso por outra conta" });
  }

  const result = await db.transaction(async (tx) => {
   const userUpdate: Record<string, unknown> = {
    name,
    document: documentDigits,
    accountType,
    homeService: homeService ?? false,
    businessType,
    aiStyle,
    customAiStyle: customAiStyle || null,
    privacyAccepted: privacyAccepted ?? false,
    phone: phone || null,
   };

   if (scheduleInterval !== undefined) {
    userUpdate.scheduleInterval = Number(scheduleInterval);
   }
   if (appointmentBuffer !== undefined) {
    userUpdate.appointmentBuffer = Number(appointmentBuffer);
   }

   // senha só entra no update se foi enviada
   if (password) {
    userUpdate.password = await bcrypt.hash(password, SALT_ROUNDS);
   }

   const [updatedUser] = await tx
    .update(usersTable)
    .set(userUpdate)
    .where(eq(usersTable.id, userId))
    .returning();

   if (!updatedUser) {
    throw new Error("USER_NOT_FOUND");
   }

   // Endereço: atualiza se já existir, cria se não existir
   const [existingAddress] = await tx
    .select({ id: addressesTable.id })
    .from(addressesTable)
    .where(eq(addressesTable.userId, userId))
    .limit(1);

   const addressData = {
    cep: address.cep,
    street: address.street,
    number: address.number,
    complement: address.complement || null,
    neighborhood: address.neighborhood,
    city: address.city,
    state: address.state,
   };

   const [updatedAddress] = existingAddress
    ? await tx.update(addressesTable).set(addressData).where(eq(addressesTable.userId, userId)).returning()
    : await tx.insert(addressesTable).values({ userId, ...addressData }).returning();

   if (!updatedAddress) {
    throw new Error("ADDRESS_UPDATE_FAILED");
   }

   // Horário de trabalho: atualiza o template e os dias
   let updatedScheduleData: any = null;
   let updatedScheduleDays: any[] = [];

   if (workSchedule) {
    const [existingSchedule] = await tx
     .select({ id: workSchedulesTable.id })
     .from(workSchedulesTable)
     .where(eq(workSchedulesTable.userId, userId))
     .limit(1);

    const scheduleTemplateData = {
     name: workSchedule.name || "Jornada Padrão",
     isActive: workSchedule.isActive ?? true,
     updatedAt: new Date(),
    };

    let scheduleId: number;

    if (existingSchedule) {
     const [updated] = await tx
      .update(workSchedulesTable)
      .set(scheduleTemplateData)
      .where(eq(workSchedulesTable.userId, userId))
      .returning();
     scheduleId = updated!.id;
    } else {
     const [created] = await tx
      .insert(workSchedulesTable)
      .values({ userId, ...scheduleTemplateData })
      .returning();
     scheduleId = created!.id;
    }

    // Atualiza os dias da jornada
    if (workSchedule.days && Array.isArray(workSchedule.days) && workSchedule.days.length > 0) {
     // Remove dias antigos
     await tx
      .delete(workScheduleDaysTable)
      .where(eq(workScheduleDaysTable.workScheduleId, scheduleId));

     // Insere novos dias
     const daysToInsert = workSchedule.days.map((day: any) => ({
      workScheduleId: scheduleId,
      dayOfWeek: day.dayOfWeek,
      startTime: day.startTime,
      endTime: day.endTime,
      appointmentInterval: day.appointmentInterval,
      isActive: day.isActive ?? true,
     }));

     updatedScheduleDays = await tx
      .insert(workScheduleDaysTable)
      .values(daysToInsert)
      .returning();
    }

    updatedScheduleData = {
     id: scheduleId,
     name: scheduleTemplateData.name,
     isActive: scheduleTemplateData.isActive,
     days: updatedScheduleDays,
    };
   }

   const { password: _password, ...userWithoutPassword } = updatedUser;

   return {
    ...userWithoutPassword,
    address: updatedAddress,
    workSchedule: updatedScheduleData,
   };
  });

  return res.status(200).json(result);
 } catch (error: any) {
  if (error?.message === "USER_NOT_FOUND") {
   return res.status(404).json({ error: "Usuário não encontrado" });
  }
  if (error?.code === "23505") {
   return res.status(409).json({ error: "Este CPF/CNPJ já está em uso por outra conta" });
  }
  console.error("ERRO DETALHADO:", error); // <-- adiciona isso
  return res.status(500).json({ error: "Erro ao salvar configurações" });
 }
};

export default UpdateSettings;