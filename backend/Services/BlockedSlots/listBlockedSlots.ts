/**
 * Service: ListBlockedSlots
 *
 * Responsabilidade:
 * Listar todos os bloqueios de horário de um profissional.
 *
 * Query params:
 * - from (opcional): filtra bloqueios a partir de uma data
 * - to (opcional): junto com "from", filtra bloqueios que tocam o intervalo
 *   [from, to) — inclui bloqueios que começaram antes de "from" mas ainda não terminaram
 *
 * Exemplo: GET /blocked-slots?from=2025-07-20T00:00:00Z&to=2025-07-21T00:00:00Z
 */

import type { Request, Response } from "express";
import { eq, gte, lt, gt, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { blockedSlotsTable } from "../../db/schema/blockedSlots.js";

const ListBlockedSlots = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { from, to } = req.query;

    const conditions = [eq(blockedSlotsTable.userId, userId)];

    if (from && to) {
      conditions.push(lt(blockedSlotsTable.startAt, new Date(String(to))));
      conditions.push(gt(blockedSlotsTable.endAt, new Date(String(from))));
    } else if (from) {
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
