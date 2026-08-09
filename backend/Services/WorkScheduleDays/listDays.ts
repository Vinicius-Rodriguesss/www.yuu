/**
 * Service: ListWorkScheduleDays
 *
 * Responsabilidade:
 * Listar os dias da semana configurados para uma jornada de trabalho.
 */

import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { workScheduleDaysTable } from "../../db/schema/workScheduleDays.js";

const ListWorkScheduleDays = async (req: Request, res: Response) => {
  try {
    const { workScheduleId } = req.params;

    const days = await db
      .select()
      .from(workScheduleDaysTable)
      .where(eq(workScheduleDaysTable.workScheduleId, Number(workScheduleId)));

    return res.status(200).json(days);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar dias da jornada" });
  }
};

export default ListWorkScheduleDays;
