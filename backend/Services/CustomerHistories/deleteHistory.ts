/**
 * Service: DeleteCustomerHistory
 *
 * Responsabilidade:
 * Remover um registro de histórico/anotação.
 */

import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { customerHistoriesTable } from "../../db/schema/customerHistories.js";

const DeleteCustomerHistory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [deleted] = await db
      .delete(customerHistoriesTable)
      .where(eq(customerHistoriesTable.id, Number(id)))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: "Histórico não encontrado" });
    }

    return res.status(200).json({ message: "Histórico excluído com sucesso" });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao excluir histórico" });
  }
};

export default DeleteCustomerHistory;
