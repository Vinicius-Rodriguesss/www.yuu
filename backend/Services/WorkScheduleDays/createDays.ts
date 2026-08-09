/**
 * Service: CreateWorkScheduleDays
 *
 * Responsabilidade:
 * Definir os dias da semana e horários de uma jornada de trabalho.
 *
 * Fluxo:
 * 1. Recebe workScheduleId e um array de dias
 * 2. Remove os dias antigos dessa jornada (limpa antes de inserir)
 * 3. Insere os novos dias
 * 4. Retorna os dias criados
 *
 * Exemplo de payload:
 * {
 *   "workScheduleId": 1,
 *   "days": [
 *     { "dayOfWeek": 1, "startTime": "08:00", "endTime": "18:00", "appointmentInterval": 30, "isActive": true },
 *     { "dayOfWeek": 2, "startTime": "08:00", "endTime": "18:00", "appointmentInterval": 30, "isActive": true }
 *   ]
 * }
 */

import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { workScheduleDaysTable } from "../../db/schema/workScheduleDays.js";

const CreateWorkScheduleDays = async (req: Request, res: Response) => {
  try {
    const { workScheduleId, days } = req.body;

    if (!workScheduleId || !Array.isArray(days) || days.length === 0) {
      return res.status(400).json({ error: "Dias da jornada são obrigatórios" });
    }

    // Limpa os dias antigos antes de inserir os novos
    await db
      .delete(workScheduleDaysTable)
      .where(eq(workScheduleDaysTable.workScheduleId, Number(workScheduleId)));

    const inserted = await db
      .insert(workScheduleDaysTable)
      .values(
        days.map((day: any) => ({
          workScheduleId: Number(workScheduleId),
          dayOfWeek: day.dayOfWeek,
          startTime: day.startTime,
          endTime: day.endTime,
          appointmentInterval: day.appointmentInterval,
          isActive: day.isActive ?? true,
        }))
      )
      .returning();

    return res.status(201).json(inserted);
  } catch (error) {
    console.error("ERRO DETALHADO:", error);
    return res.status(500).json({ error: "Erro ao criar dias da jornada" });
  }
};

export default CreateWorkScheduleDays;
