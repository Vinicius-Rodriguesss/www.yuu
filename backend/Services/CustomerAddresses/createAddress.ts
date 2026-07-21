/**
 * Service: CreateCustomerAddress
 *
 * Responsabilidade:
 * Adicionar um endereço a um cliente existente.
 *
 * Fluxo:
 * 1. Valida campos obrigatórios (cep, street, number, neighborhood, city, state)
 * 2. Insere o endereço vinculado ao customerId
 * 3. Define isPrimary como false por padrão
 */

import type { Request, Response } from "express";
import { db } from "../../db/index.js";
import { customerAddressesTable } from "../../db/schema/customerAddresses.js";

const CreateCustomerAddress = async (req: Request, res: Response) => {
  try {
    const { customerId, cep, street, number, complement, neighborhood, city, state, isPrimary } = req.body;

    if (!customerId || !cep || !street || !number || !neighborhood || !city || !state) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes" });
    }

    const [newAddress] = await db
      .insert(customerAddressesTable)
      .values({
        customerId,
        cep,
        street,
        number,
        complement,
        neighborhood,
        city,
        state,
        isPrimary: isPrimary ?? false,
      })
      .returning();

    return res.status(201).json(newAddress);
  } catch (error) {
    console.error("ERRO DETALHADO:", error);
    return res.status(500).json({ error: "Erro ao criar endereço do cliente" });
  }
};

export default CreateCustomerAddress;
