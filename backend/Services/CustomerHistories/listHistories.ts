/**
 * Service: ListCustomerHistories
 *
 * Responsabilidade:
 * Listar todas as anotações/históricos de um cliente.
 */

import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { customerHistoriesTable } from "../../db/schema/customerHistories.js";

const ListCustomerHistories = async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;

    const histories = await db
      .select()
      .from(customerHistoriesTable)
      .where(eq(customerHistoriesTable.customerId, Number(customerId)));

    return res.status(200).json(histories);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar históricos" });
  }
};

export default ListCustomerHistories;
