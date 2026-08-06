/**
 * Service: UpdateCustomer
 *
 * Responsabilidade:
 * Atualizar dados de um cliente existente.
 *
 * Fluxo:
 * 1. Extrai userId do token
 * 2. Atualiza os campos enviados no body
 * 3. Verifica se o cliente pertence ao profissional (where + and)
 * 4. Retorna o cliente atualizado ou 404 se não encontrado
 */

import type { Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { customersTable } from "../../db/schema/customers.js";
import { duplicateCustomerFieldError } from "./duplicateCustomerFieldError.js";

const UpdateCustomer = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { name, document, phone, email, birthDate, notes } = req.body;

    const [updated] = await db
      .update(customersTable)
      .set({
        name,
        document: document || null,
        phone: phone || null,
        email: email || null,
        birthDate,
        notes,
      })
      .where(and(eq(customersTable.id, Number(id)), eq(customersTable.userId, userId)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Cliente não encontrado" });
    }

    return res.status(200).json(updated);
  } catch (error: any) {
    const duplicateMessage = duplicateCustomerFieldError(error);
    if (duplicateMessage) {
      return res.status(409).json({ error: duplicateMessage });
    }
    console.error("ERRO DETALHADO:", error);
    return res.status(500).json({ error: "Erro ao atualizar cliente" });
  }
};

export default UpdateCustomer;
