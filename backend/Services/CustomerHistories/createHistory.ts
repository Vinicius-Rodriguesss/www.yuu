/**
 * Service: CreateCustomerHistory
 *
 * Responsabilidade:
 * Registrar uma anotação, preferência, alergia ou observação sobre o cliente.
 *
 * Fluxo:
 * 1. Extrai userId do profissional logado
 * 2. Valida campos obrigatórios (customerId, type, content)
 * 3. Salva o histórico com createdBy = profissional que registrou
 */

import type { Request, Response } from "express";
import { db } from "../../db/index.js";
import { customerHistoriesTable } from "../../db/schema/customerHistories.js";

const CreateCustomerHistory = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { customerId, type, content } = req.body;

    if (!customerId || !type || !content) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes" });
    }

    const [newHistory] = await db
      .insert(customerHistoriesTable)
      .values({ customerId, type, content, createdBy: userId })
      .returning();

    return res.status(201).json(newHistory);
  } catch (error) {
    console.error("ERRO DETALHADO:", error);
    return res.status(500).json({ error: "Erro ao criar histórico" });
  }
};

export default CreateCustomerHistory;
