/**
 * Service: UpdateBlockedSlot
 *
 * Responsabilidade:
 * Atualizar o horário (startAt/endAt) de um bloqueio já existente — usado ao
 * arrastar o bloco de bloqueio pra outro horário na grade do calendário.
 */

import type { Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { blockedSlotsTable } from "../../db/schema/blockedSlots.js";

const UpdateBlockedSlot = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { startAt, endAt } = req.body;

    if (!startAt || !endAt) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes" });
    }

    const [updated] = await db
      .update(blockedSlotsTable)
      .set({ startAt, endAt })
      .where(and(eq(blockedSlotsTable.id, Number(id)), eq(blockedSlotsTable.userId, userId)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Bloqueio não encontrado" });
    }

    return res.status(200).json(updated);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao atualizar bloqueio" });
  }
};

export default UpdateBlockedSlot;
