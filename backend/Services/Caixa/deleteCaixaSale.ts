// Services/Caixa/deleteCaixaSale.ts
// DELETE /caixa/:id — remove a venda inteira (os itens caem por cascade).
import type { Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { caixaSalesTable } from "../../db/schema/caixaSales.js";

const DeleteCaixaSale = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const [deleted] = await db
      .delete(caixaSalesTable)
      .where(and(eq(caixaSalesTable.id, Number(id)), eq(caixaSalesTable.userId, userId)))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: "Venda não encontrada" });
    }

    return res.status(200).json({ message: "Venda removida com sucesso" });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao remover venda" });
  }
};

export default DeleteCaixaSale;
