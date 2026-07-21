/**
 * Service: CreateCustomer
 *
 * Responsabilidade:
 * Cadastrar um novo cliente vinculado ao profissional logado.
 *
 * Fluxo:
 * 1. Extrai userId do token (req.userId)
 * 2. Valida se o nome foi informado
 * 3. Insere o cliente na tabela customers com userId
 * 4. Retorna o cliente criado
 *
 * Campos obrigatórios: name
 * Campos opcionais: document, phone, email, birthDate, notes
 */

import type { Request, Response } from "express";
import { db } from "../../db/index.js";
import { customersTable } from "../../db/schema/customers.js";

const CreateCustomer = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { name, document, phone, email, birthDate, notes } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Nome é obrigatório" });
    }

    const [newCustomer] = await db
      .insert(customersTable)
      .values({ userId, name, document, phone, email, birthDate, notes })
      .returning();

    return res.status(201).json(newCustomer);
  } catch (error) {
    console.error("ERRO DETALHADO:", error);
    return res.status(500).json({ error: "Erro ao criar cliente" });
  }
};

export default CreateCustomer;
