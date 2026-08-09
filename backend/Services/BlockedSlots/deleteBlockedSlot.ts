/**
 * Service: DeleteBlockedSlot
 *
 * Responsabilidade:
 * Remover um bloqueio de horário específico.
 */

import type { Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { blockedSlotsTable } from "../../db/schema/blockedSlots.js";

const DeleteBlockedSlot = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const [deleted] = await db
      .delete(blockedSlotsTable)
      .where(and(eq(blockedSlotsTable.id, Number(id)), eq(blockedSlotsTable.userId, userId)))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: "Bloqueio não encontrado" });
    }

    return res.status(200).json({ message: "Bloqueio excluído com sucesso" });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao excluir bloqueio" });
  }
};

export default DeleteBlockedSlot;
