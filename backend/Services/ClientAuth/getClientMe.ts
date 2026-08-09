/**
 * Service: GetClientMe
 *
 * GET /client/me — dados da conta do CLIENTE FINAL logado (inclui o endereço
 * salvo, usado para pré-preencher o atendimento a domicílio).
 */
import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { clientAccountsTable } from "../../db/schema/clientAccounts.js";
import { clientPublicData } from "./registerClient.js";

const GetClientMe = async (req: Request, res: Response) => {
  try {
    const clientAccountId = (req as any).clientAccountId as number;

    const [client] = await db
      .select()
      .from(clientAccountsTable)
      .where(eq(clientAccountsTable.id, clientAccountId))
      .limit(1);

    if (!client) {
      return res.status(404).json({ error: "Conta não encontrada" });
    }

    return res.status(200).json({ client: clientPublicData(client) });
  } catch (error) {
    console.error("ERRO GET CLIENT ME:", error);
    return res.status(500).json({ error: "Erro ao buscar conta" });
  }
};

export default GetClientMe;
