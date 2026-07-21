/**
 * Service: CreateBlockedSlot
 *
 * Responsabilidade:
 * Criar um bloqueio de horário (pausa, folga, indisponibilidade).
 *
 * Fluxo:
 * 1. Extrai userId do profissional logado
 * 2. Valida campos obrigatórios (type, title, startAt, endAt)
 * 3. Insere o bloqueio
 *
 * Exemplos de uso:
 * - Almoço das 12h às 13h todos os dias (isRecurring: true)
 * - Folga no dia 25/12 das 00h às 23h59
 */

import type { Request, Response } from "express";
import { db } from "../../db/index.js";
import { blockedSlotsTable } from "../../db/schema/blockedSlots.js";

const CreateBlockedSlot = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { type, title, startAt, endAt, isRecurring, recurrenceRule } = req.body;

    if (!type || !title || !startAt || !endAt) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes" });
    }

    const [newSlot] = await db
      .insert(blockedSlotsTable)
      .values({
        userId,
        type,
        title,
        startAt,
        endAt,
        isRecurring: isRecurring ?? false,
        recurrenceRule,
      })
      .returning();

    return res.status(201).json(newSlot);
  } catch (error) {
    console.error("ERRO DETALHADO:", error);
    return res.status(500).json({ error: "Erro ao criar bloqueio" });
  }
};

export default CreateBlockedSlot;
