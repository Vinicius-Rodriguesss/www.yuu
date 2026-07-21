/**
 * Service: ListBlockedSlots
 *
 * Responsabilidade:
 * Listar todos os bloqueios de horário de um profissional.
 *
 * Query params:
 * - from (opcional): filtra bloqueios a partir de uma data
 *
 * Exemplo: GET /blocked-slots?from=2025-07-20T00:00:00Z
 */

import type { Request, Response } from "express";
import { eq, gte, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { blockedSlotsTable } from "../../db/schema/blockedSlots.js";

const ListBlockedSlots = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { from } = req.query;

    const conditions = [eq(blockedSlotsTable.userId, userId)];

    if (from) {
      conditions.push(gte(blockedSlotsTable.startAt, new Date(String(from))));
    }

    const slots = await db
      .select()
      .from(blockedSlotsTable)
      .where(and(...conditions));

    return res.status(200).json(slots);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar bloqueios" });
  }
};

export default ListBlockedSlots;
