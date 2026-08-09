// Services/Caixa/deleteCaixaEntry.ts
import type { Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { caixaEntriesTable } from "../../db/schema/caixaEntries.js";

const DeleteCaixaEntry = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const [deleted] = await db
      .delete(caixaEntriesTable)
      .where(and(eq(caixaEntriesTable.id, Number(id)), eq(caixaEntriesTable.userId, userId)))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: "Lançamento não encontrado" });
    }

    return res.status(200).json({ message: "Lançamento removido com sucesso" });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao remover lançamento" });
  }
};

export default DeleteCaixaEntry;
