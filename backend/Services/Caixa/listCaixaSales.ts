/**
 * Service: ListCaixaSales
 *
 * GET /caixa?date=YYYY-MM-DD
 * Lista as vendas do dia (cada uma com seus itens), o total geral do dia e o
 * total por forma de pagamento. Total de cada venda = SUM(itens) - desconto.
 */

import type { Request, Response } from "express";
import { eq, and, gte, lt, asc, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import { caixaSalesTable } from "../../db/schema/caixaSales.js";
import { caixaEntriesTable } from "../../db/schema/caixaEntries.js";

const ListCaixaSales = async (req: Request, res: Response) => {
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

    // Hora de parede: soldAt guarda o horário literal do profissional, sem fuso.
    const dayStart = new Date(Date.UTC(y, m - 1, d));
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    const sales = await db
      .select()
      .from(caixaSalesTable)
      .where(
        and(
          eq(caixaSalesTable.userId, userId),
          gte(caixaSalesTable.soldAt, dayStart),
          lt(caixaSalesTable.soldAt, dayEnd)
        )
      )
      .orderBy(asc(caixaSalesTable.soldAt));

    const saleIds = sales.map((s) => s.id);
    const items = saleIds.length
      ? await db.select().from(caixaEntriesTable).where(inArray(caixaEntriesTable.saleId, saleIds))
      : [];

    const itemsBySale = new Map<number, typeof items>();
    for (const item of items) {
      const list = itemsBySale.get(item.saleId) ?? [];
      list.push(item);
      itemsBySale.set(item.saleId, list);
    }

    let total = 0;
    const totalByMethod: Record<string, number> = {};

    const result = sales.map((sale) => {
      const saleItems = itemsBySale.get(sale.id) ?? [];
      const subtotal = saleItems.reduce((sum, it) => sum + Number(it.amount), 0);
      const discount = Number(sale.discount);
      const saleTotal = Number((subtotal - discount).toFixed(2));

      total += saleTotal;
      totalByMethod[sale.paymentMethod] = (totalByMethod[sale.paymentMethod] ?? 0) + saleTotal;

      return {
        ...sale,
        items: saleItems,
        subtotal: Number(subtotal.toFixed(2)),
        total: saleTotal,
      };
    });

    return res.status(200).json({
      date: dayStart.toISOString().slice(0, 10),
      sales: result,
      total: Number(total.toFixed(2)),
      totalByMethod,
    });
  } catch (error) {
    console.error("ERRO AO LISTAR CAIXA:", error);
    return res.status(500).json({ error: "Erro ao buscar vendas do caixa" });
  }
};

export default ListCaixaSales;
