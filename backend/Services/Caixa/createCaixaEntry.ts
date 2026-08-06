/**
 * Service: CreateCaixaEntry
 *
 * Responsabilidade:
 * Registrar uma venda avulsa no caixa — de um serviço prestado, um produto vendido,
 * ou algo livre ("outro"), com valor, forma de pagamento e horário.
 */

import type { Request, Response } from "express";
import { db } from "../../db/index.js";
import { caixaEntriesTable } from "../../db/schema/caixaEntries.js";

const VALID_TYPES = ["service", "product", "other"];
const VALID_PAYMENT_METHODS = ["dinheiro", "cartao", "pix", "outro"];

const CreateCaixaEntry = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const {
      type,
      serviceId,
      productId,
      customerId,
      description,
      amount,
      paymentMethod,
      soldAt,
      notes,
    } = req.body;

    if (!type || !VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: "Tipo de lançamento inválido" });
    }
    if (!description || !amount || !soldAt) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes" });
    }
    if (paymentMethod && !VALID_PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({ error: "Forma de pagamento inválida" });
    }

    const [newEntry] = await db
      .insert(caixaEntriesTable)
      .values({
        userId,
        type,
        serviceId: serviceId ? Number(serviceId) : null,
        productId: productId ? Number(productId) : null,
        customerId: customerId ? Number(customerId) : null,
        description,
        amount: String(amount),
        paymentMethod: paymentMethod || "dinheiro",
        soldAt: new Date(soldAt),
        notes: notes || null,
      })
      .returning();

    return res.status(201).json(newEntry);
  } catch (error) {
    console.error("ERRO DETALHADO:", error);
    return res.status(500).json({ error: "Erro ao registrar venda" });
  }
};

export default CreateCaixaEntry;
