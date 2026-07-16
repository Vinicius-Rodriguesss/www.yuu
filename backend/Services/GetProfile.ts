// Services/GetProfile.ts
import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { usersTable } from "../db/schema/users.js";
import { addressesTable } from "../db/schema/addresses.js";
import { workSchedulesTable } from "../db/schema/workSchedules.js";

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
    startTime: workSchedulesTable.startTime,
    endTime: workSchedulesTable.endTime,
    daysOfWeek: workSchedulesTable.daysOfWeek,
    // lunchStart: workSchedulesTable.lunchStart,
    // lunchEnd: workSchedulesTable.lunchEnd,
    // ^ descomente depois de rodar a migration em work_schedules
   })
   .from(workSchedulesTable)
   .where(eq(workSchedulesTable.userId, userId))
   .limit(1);

  return res.status(200).json({
   ...user,
   address: address
    ? { ...address, complement: address.complement || "" }
    : { cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "" },
   workSchedule: schedule
    ? {
     startTime: schedule.startTime,
     endTime: schedule.endTime,
     daysOfWeek: schedule.daysOfWeek.split(",").filter(Boolean).map(Number),
     lunchStart: null, // troque por schedule.lunchStart quando a coluna existir
     lunchEnd: null,
    }
    : { startTime: "", endTime: "", daysOfWeek: [], lunchStart: null, lunchEnd: null },
  });
 } catch (error) {
  console.error("ERRO DETALHADO:", error); // <-- adiciona isso
  return res.status(500).json({ error: "Erro ao carregar dados" });
 }
};

export default GetProfile;