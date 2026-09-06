/**
 * Service: CreateCaixaSale
 *
 * POST /caixa
 * Registra uma venda no caixa com um ou mais itens (serviços, produtos ou
 * "outro"), forma de pagamento, horário e desconto opcional.
 *
 * Body:
 * {
 *   customerId?: number,
 *   paymentMethod?: "dinheiro" | "cartao" | "pix" | "outro",
 *   soldAt: string (ISO),
 *   discount?: number,
 *   notes?: string,
 *   items: [{ type: "service"|"product"|"other", serviceId?, productId?, description, amount }]
 * }
 */

import type { Request, Response } from "express";
import { db } from "../../db/index.js";
import { caixaSalesTable } from "../../db/schema/caixaSales.js";
import { caixaEntriesTable } from "../../db/schema/caixaEntries.js";

const VALID_TYPES = ["service", "product", "other"];
const VALID_PAYMENT_METHODS = ["dinheiro", "cartao", "pix", "outro"];

const CreateCaixaSale = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { customerId, paymentMethod, soldAt, discount, notes, items } = req.body;

    if (!soldAt || isNaN(new Date(soldAt).getTime())) {
      return res.status(400).json({ error: "Horário da venda inválido" });
    }
    if (paymentMethod && !VALID_PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({ error: "Forma de pagamento inválida" });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Adicione ao menos um item à venda" });
    }

    let subtotal = 0;
    const normalizedItems: {
      type: string;
      serviceId: number | null;
      productId: number | null;
      description: string;
      amount: string;
    }[] = [];

    for (const item of items) {
      if (!item || !VALID_TYPES.includes(item.type)) {
        return res.status(400).json({ error: "Item com tipo inválido" });
      }
      const description = String(item.description ?? "").trim();
      const amount = Number(item.amount);
      if (!description) {
        return res.status(400).json({ error: "Todo item precisa de uma descrição" });
      }
      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({ error: `Valor inválido no item "${description}"` });
      }
      subtotal += amount;
      normalizedItems.push({
        type: item.type,
        serviceId: item.type === "service" && item.serviceId ? Number(item.serviceId) : null,
        productId: item.type === "product" && item.productId ? Number(item.productId) : null,
        description,
        amount: amount.toFixed(2),
      });
    }

    const discountNumber = discount === undefined || discount === null || discount === "" ? 0 : Number(discount);
    if (isNaN(discountNumber) || discountNumber < 0) {
      return res.status(400).json({ error: "Desconto inválido" });
    }
    if (discountNumber > subtotal) {
      return res.status(400).json({ error: "Desconto não pode ser maior que o subtotal" });
    }

    const sale = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(caixaSalesTable)
        .values({
          userId,
          customerId: customerId ? Number(customerId) : null,
          discount: discountNumber.toFixed(2),
          paymentMethod: paymentMethod || "dinheiro",
          soldAt: new Date(soldAt),
          notes: notes?.trim() || null,
        })
        .returning();

      if (!created) throw new Error("Falha ao criar a venda");

      const insertedItems = await tx
        .insert(caixaEntriesTable)
        .values(normalizedItems.map((it) => ({ ...it, saleId: created.id })))
        .returning();

      return { ...created, items: insertedItems };
    });

    return res.status(201).json({
      ...sale,
      subtotal: Number(subtotal.toFixed(2)),
      total: Number((subtotal - discountNumber).toFixed(2)),
    });
  } catch (error) {
    console.error("ERRO AO REGISTRAR VENDA:", error);
    return res.status(500).json({ error: "Erro ao registrar venda" });
  }
};

export default CreateCaixaSale;
