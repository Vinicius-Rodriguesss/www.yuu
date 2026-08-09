/**
 * Service: DeleteCustomerAddress
 *
 * Responsabilidade:
 * Remover um endereço de um cliente.
 */

import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { customerAddressesTable } from "../../db/schema/customerAddresses.js";

const DeleteCustomerAddress = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [deleted] = await db
      .delete(customerAddressesTable)
      .where(eq(customerAddressesTable.id, Number(id)))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: "Endereço não encontrado" });
    }

    return res.status(200).json({ message: "Endereço excluído com sucesso" });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao excluir endereço" });
  }
};

export default DeleteCustomerAddress;
