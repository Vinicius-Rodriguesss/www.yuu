/**
 * Service: ListCustomerAddresses
 *
 * Responsabilidade:
 * Listar todos os endereços de um cliente específico.
 */

import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { customerAddressesTable } from "../../db/schema/customerAddresses.js";

const ListCustomerAddresses = async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;

    const addresses = await db
      .select()
      .from(customerAddressesTable)
      .where(eq(customerAddressesTable.customerId, Number(customerId)));

    return res.status(200).json(addresses);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar endereços" });
  }
};

export default ListCustomerAddresses;
