/**
 * Service: GetCustomer
 *
 * Responsabilidade:
 * Buscar um cliente específico com todos os seus relacionamentos
 * (endereços e histórico de anotações).
 *
 * Fluxo:
 * 1. Extrai userId do token
 * 2. Busca o cliente pelo ID (verificando se pertence ao profissional)
 * 3. Se não encontrar, retorna 404
 * 4. Busca endereços e históricos do cliente
 * 5. Retorna objeto combinado: { ...customer, addresses, histories }
 */

import type { Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { customersTable } from "../../db/schema/customers.js";
import { customerAddressesTable } from "../../db/schema/customerAddresses.js";
import { customerHistoriesTable } from "../../db/schema/customerHistories.js";

const GetCustomer = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const [customer] = await db
      .select()
      .from(customersTable)
      .where(and(eq(customersTable.id, Number(id)), eq(customersTable.userId, userId)))
      .limit(1);

    if (!customer) {
      return res.status(404).json({ error: "Cliente não encontrado" });
    }

    const addresses = await db
      .select()
      .from(customerAddressesTable)
      .where(eq(customerAddressesTable.customerId, Number(id)));

    const histories = await db
      .select()
      .from(customerHistoriesTable)
      .where(eq(customerHistoriesTable.customerId, Number(id)));

    return res.status(200).json({ ...customer, addresses, histories });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar cliente" });
  }
};

export default GetCustomer;
