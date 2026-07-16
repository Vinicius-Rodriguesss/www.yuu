// Services/UpdateSettings.ts
import type { Request, Response } from "express";
import { and, eq, ne } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "../db/index.js";
import { usersTable } from "../db/schema/users.js";
import { addressesTable } from "../db/schema/addresses.js";
import { workSchedulesTable } from "../db/schema/workSchedules.js";

const SALT_ROUNDS = 10;

const UpdateSettings = async (req: Request, res: Response) => {
 try {
  const userId = (req as any).userId;
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

  if (!name || !document || !address || !accountType || !businessType || !aiStyle || !workSchedule) {
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
  if (!workSchedule.startTime || !workSchedule.endTime || !Array.isArray(workSchedule.daysOfWeek)) {
   return res.status(400).json({ error: "Horário de trabalho incompleto" });
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
   };

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

   // Horário de trabalho: mesma lógica de update-ou-insere
   const [existingSchedule] = await tx
    .select({ id: workSchedulesTable.id })
    .from(workSchedulesTable)
    .where(eq(workSchedulesTable.userId, userId))
    .limit(1);

   const scheduleData = {
    startTime: workSchedule.startTime,
    endTime: workSchedule.endTime,
    daysOfWeek: workSchedule.daysOfWeek.join(","),
    // lunchStart: workSchedule.lunchStart ?? null,
    // lunchEnd: workSchedule.lunchEnd ?? null,
    // ^ descomente depois de rodar a migration adicionando lunch_start/lunch_end em work_schedules
    updatedAt: new Date(),
   };

   const [updatedSchedule] = existingSchedule
    ? await tx
     .update(workSchedulesTable)
     .set(scheduleData)
     .where(eq(workSchedulesTable.userId, userId))
     .returning()
    : await tx
     .insert(workSchedulesTable)
     .values({ userId, ...scheduleData })
     .returning();

   if (!updatedSchedule) {
    throw new Error("SCHEDULE_UPDATE_FAILED");
   }

   const { password: _password, ...userWithoutPassword } = updatedUser;

   return {
    ...userWithoutPassword,
    address: updatedAddress,
    workSchedule: {
     ...updatedSchedule,
     daysOfWeek: updatedSchedule.daysOfWeek.split(",").filter(Boolean).map(Number),
    },
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