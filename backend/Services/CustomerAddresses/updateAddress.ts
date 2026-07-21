/**
 * Service: UpdateCustomerAddress
 *
 * Responsabilidade:
 * Atualizar um endereço existente (ex: trocar número, definir como principal).
 */

import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { customerAddressesTable } from "../../db/schema/customerAddresses.js";

const UpdateCustomerAddress = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { cep, street, number, complement, neighborhood, city, state, isPrimary } = req.body;

    const [updated] = await db
      .update(customerAddressesTable)
      .set({ cep, street, number, complement, neighborhood, city, state, isPrimary })
      .where(eq(customerAddressesTable.id, Number(id)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Endereço não encontrado" });
    }

    return res.status(200).json(updated);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao atualizar endereço" });
  }
};

export default UpdateCustomerAddress;
