/**
 * Service: ListCustomers
 *
 * Responsabilidade:
 * Listar todos os clientes cadastrados pelo profissional logado.
 *
 * Fluxo:
 * 1. Extrai userId do token
 * 2. Busca todos os customers onde userId = profissional
 * 3. Retorna array de clientes
 */

import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { customersTable } from "../../db/schema/customers.js";

const ListCustomers = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const customers = await db
      .select()
      .from(customersTable)
      .where(eq(customersTable.userId, userId));

    return res.status(200).json(customers);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar clientes" });
  }
};

export default ListCustomers;
