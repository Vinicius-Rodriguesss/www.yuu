/**
 * Service: DeleteCustomer
 *
 * Responsabilidade:
 * Excluir um cliente e todos os seus dados relacionados (cascade).
 *
 * Fluxo:
 * 1. Extrai userId do token
 * 2. Deleta o cliente onde id = params.id E userId = profissional
 * 3. Retorna mensagem de sucesso ou 404
 *
 * Observação: Como as tabelas filhas (addresses, histories, appointments)
 * usam onDelete: "cascade", os dados relacionados são removidos automaticamente.
 */

import type { Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { customersTable } from "../../db/schema/customers.js";

const DeleteCustomer = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const [deleted] = await db
      .delete(customersTable)
      .where(and(eq(customersTable.id, Number(id)), eq(customersTable.userId, userId)))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: "Cliente não encontrado" });
    }

    return res.status(200).json({ message: "Cliente excluído com sucesso" });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao excluir cliente" });
  }
};

export default DeleteCustomer;
