/**
 * CRUD dos endereços da conta GLOBAL do cliente final.
 * GET /client/addresses, POST /client/addresses, PUT /client/addresses/:id,
 * DELETE /client/addresses/:id — todas exigem clientAuthMiddleware.
 */
import type { Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { clientAddressesTable } from "../../db/schema/clientAddresses.js";

interface AddressBody {
  label?: string;
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  isPrimary?: boolean;
}

const validateAddress = (body: AddressBody): string | null => {
  if (!body.cep?.trim()) return "CEP é obrigatório";
  if (!body.street?.trim()) return "Rua é obrigatória";
  if (!body.number?.trim()) return "Número é obrigatório";
  if (!body.neighborhood?.trim()) return "Bairro é obrigatório";
  if (!body.city?.trim()) return "Cidade é obrigatória";
  if (!body.state?.trim() || body.state.trim().length !== 2) return "Estado inválido (use a sigla, ex: SP)";
  return null;
};

export const ListClientAddresses = async (req: Request, res: Response) => {
  try {
    const clientAccountId = (req as any).clientAccountId as number;
    const addresses = await db
      .select()
      .from(clientAddressesTable)
      .where(eq(clientAddressesTable.clientAccountId, clientAccountId))
      .orderBy(clientAddressesTable.isPrimary, clientAddressesTable.id);
    // principal primeiro
    addresses.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
    return res.status(200).json(addresses);
  } catch (error) {
    console.error("ERRO LIST CLIENT ADDRESSES:", error);
    return res.status(500).json({ error: "Erro ao buscar endereços" });
  }
};

export const CreateClientAddress = async (req: Request<{}, {}, AddressBody>, res: Response) => {
  try {
    const clientAccountId = (req as any).clientAccountId as number;
    const body = req.body;

    const validationError = validateAddress(body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const [existing] = await db
      .select({ id: clientAddressesTable.id })
      .from(clientAddressesTable)
      .where(eq(clientAddressesTable.clientAccountId, clientAccountId))
      .limit(1);

    const makesPrimary = !existing || Boolean(body.isPrimary);

    if (makesPrimary) {
      await db
        .update(clientAddressesTable)
        .set({ isPrimary: false })
        .where(eq(clientAddressesTable.clientAccountId, clientAccountId));
    }

    const [created] = await db
      .insert(clientAddressesTable)
      .values({
        clientAccountId,
        label: body.label?.trim() || null,
        cep: body.cep!.trim(),
        street: body.street!.trim(),
        number: body.number!.trim(),
        complement: body.complement?.trim() || null,
        neighborhood: body.neighborhood!.trim(),
        city: body.city!.trim(),
        state: body.state!.trim().toUpperCase(),
        isPrimary: makesPrimary,
      })
      .returning();

    return res.status(201).json(created);
  } catch (error) {
    console.error("ERRO CREATE CLIENT ADDRESS:", error);
    return res.status(500).json({ error: "Erro ao criar endereço" });
  }
};

export const UpdateClientAddress = async (req: Request<{ id: string }, {}, AddressBody>, res: Response) => {
  try {
    const clientAccountId = (req as any).clientAccountId as number;
    const id = Number(req.params.id);
    const body = req.body;

    const validationError = validateAddress(body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const [existing] = await db
      .select({ id: clientAddressesTable.id })
      .from(clientAddressesTable)
      .where(and(eq(clientAddressesTable.id, id), eq(clientAddressesTable.clientAccountId, clientAccountId)))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Endereço não encontrado" });
    }

    if (body.isPrimary) {
      await db
        .update(clientAddressesTable)
        .set({ isPrimary: false })
        .where(eq(clientAddressesTable.clientAccountId, clientAccountId));
    }

    const [updated] = await db
      .update(clientAddressesTable)
      .set({
        label: body.label?.trim() || null,
        cep: body.cep!.trim(),
        street: body.street!.trim(),
        number: body.number!.trim(),
        complement: body.complement?.trim() || null,
        neighborhood: body.neighborhood!.trim(),
        city: body.city!.trim(),
        state: body.state!.trim().toUpperCase(),
        isPrimary: body.isPrimary ? true : undefined,
        updatedAt: new Date(),
      })
      .where(eq(clientAddressesTable.id, id))
      .returning();

    return res.status(200).json(updated);
  } catch (error) {
    console.error("ERRO UPDATE CLIENT ADDRESS:", error);
    return res.status(500).json({ error: "Erro ao atualizar endereço" });
  }
};

export const DeleteClientAddress = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const clientAccountId = (req as any).clientAccountId as number;
    const id = Number(req.params.id);

    const [deleted] = await db
      .delete(clientAddressesTable)
      .where(and(eq(clientAddressesTable.id, id), eq(clientAddressesTable.clientAccountId, clientAccountId)))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: "Endereço não encontrado" });
    }

    // Se era o principal, promove outro (o mais recente) automaticamente
    if (deleted.isPrimary) {
      const [next] = await db
        .select({ id: clientAddressesTable.id })
        .from(clientAddressesTable)
        .where(eq(clientAddressesTable.clientAccountId, clientAccountId))
        .orderBy(clientAddressesTable.id)
        .limit(1);
      if (next) {
        await db
          .update(clientAddressesTable)
          .set({ isPrimary: true })
          .where(eq(clientAddressesTable.id, next.id));
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("ERRO DELETE CLIENT ADDRESS:", error);
    return res.status(500).json({ error: "Erro ao remover endereço" });
  }
};
