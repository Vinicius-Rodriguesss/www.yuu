// Services/Products/deleteProduct.ts
import type { Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { productsTable } from "../../db/schema/products.js";

const DeleteProduct = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const [deleted] = await db
      .delete(productsTable)
      .where(and(eq(productsTable.id, Number(id)), eq(productsTable.userId, userId)))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    return res.status(200).json({ message: "Produto excluído com sucesso" });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao excluir produto" });
  }
};

export default DeleteProduct;
