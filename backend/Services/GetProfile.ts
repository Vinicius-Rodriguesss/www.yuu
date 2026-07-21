// Services/GetProfile.ts
import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { usersTable } from "../db/schema/users.js";
import { addressesTable } from "../db/schema/addresses.js";
import { workSchedulesTable } from "../db/schema/workSchedules.js";
import { workScheduleDaysTable } from "../db/schema/workScheduleDays.js";

const GetProfile = async (req: Request, res: Response) => {
 try {
  const userId = (req as any).userId;

  const [user] = await db
   .select({
    name: usersTable.name,
    document: usersTable.document,
    accountType: usersTable.accountType,
    homeService: usersTable.homeService,
    businessType: usersTable.businessType,
    aiStyle: usersTable.aiStyle,
    customAiStyle: usersTable.customAiStyle,
    privacyAccepted: usersTable.privacyAccepted,
    phone: usersTable.phone,
    scheduleInterval: usersTable.scheduleInterval,
    appointmentBuffer: usersTable.appointmentBuffer,
    publicSlug: usersTable.publicSlug,
   })
   .from(usersTable)
   .where(eq(usersTable.id, userId))
   .limit(1);

  if (!user) {
   return res.status(404).json({ error: "Usuário não encontrado" });
  }

  const [address] = await db
   .select({
    cep: addressesTable.cep,
    street: addressesTable.street,
    number: addressesTable.number,
    complement: addressesTable.complement,
    neighborhood: addressesTable.neighborhood,
    city: addressesTable.city,
    state: addressesTable.state,
   })
   .from(addressesTable)
   .where(eq(addressesTable.userId, userId))
   .limit(1);

  const [schedule] = await db
   .select({
    id: workSchedulesTable.id,
    name: workSchedulesTable.name,
    isActive: workSchedulesTable.isActive,
   })
   .from(workSchedulesTable)
   .where(eq(workSchedulesTable.userId, userId))
   .limit(1);

  // Busca os dias da jornada na tabela work_schedule_days
  let scheduleDays: any[] = [];
  if (schedule) {
    scheduleDays = await db
      .select()
      .from(workScheduleDaysTable)
      .where(eq(workScheduleDaysTable.workScheduleId, schedule.id));
  }

  return res.status(200).json({
   ...user,
   address: address
    ? { ...address, complement: address.complement || "" }
    : { cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "" },
   workSchedule: schedule
    ? {
     id: schedule.id,
     name: schedule.name,
     isActive: schedule.isActive,
     days: scheduleDays.map((d) => ({
       dayOfWeek: d.dayOfWeek,
       startTime: d.startTime,
       endTime: d.endTime,
       appointmentInterval: d.appointmentInterval,
       isActive: d.isActive,
     })),
    }
    : null,
  });
 } catch (error) {
  console.error("ERRO DETALHADO:", error);
  return res.status(500).json({ error: "Erro ao carregar dados" });
 }
};

export default GetProfile;