/**
 * Service: ListCaixaEntries
 *
 * GET /caixa?date=YYYY-MM-DD
 * Lista os lançamentos do dia (ordenados por horário) + o total geral e o total por
 * forma de pagamento — o número que responde "quanto entrou hoje".
 */

import type { Request, Response } from "express";
import { eq, and, gte, lt, asc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { caixaEntriesTable } from "../../db/schema/caixaEntries.js";

const ListCaixaEntries = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: "Parâmetro 'date' é obrigatório (YYYY-MM-DD)" });
    }

    const [y, m, d] = String(date).split("-").map(Number);
    if (!y || !m || !d) {
      return res.status(400).json({ error: "Data inválida" });
    }

    // Mesmo modelo de "hora de parede" usado no resto do app: soldAt guarda o horário literal
    // do profissional, sem conversão de fuso — então o dia é filtrado no mesmo frame UTC.
    const dayStart = new Date(Date.UTC(y, m - 1, d));
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    const entries = await db
      .select()
      .from(caixaEntriesTable)
      .where(
        and(
          eq(caixaEntriesTable.userId, userId),
          gte(caixaEntriesTable.soldAt, dayStart),
          lt(caixaEntriesTable.soldAt, dayEnd)
        )
      )
      .orderBy(asc(caixaEntriesTable.soldAt));

    let total = 0;
    const totalByMethod: Record<string, number> = {};
    for (const entry of entries) {
      const amount = Number(entry.amount);
      total += amount;
      totalByMethod[entry.paymentMethod] = (totalByMethod[entry.paymentMethod] ?? 0) + amount;
    }

    return res.status(200).json({
      date: dayStart.toISOString().slice(0, 10),
      entries,
      total,
      totalByMethod,
    });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar lançamentos do caixa" });
  }
};

export default ListCaixaEntries;
