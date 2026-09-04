// Services/Products/updateProduct.ts
import type { Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { productsTable } from "../../db/schema/products.js";

const UpdateProduct = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { name, price, active, trackStock, stockQuantity } = req.body;

    if (
      trackStock === true &&
      stockQuantity !== undefined &&
      (isNaN(Number(stockQuantity)) || Number(stockQuantity) < 0)
    ) {
      return res.status(400).json({ error: "Quantidade em estoque inválida" });
    }

    const [updated] = await db
      .update(productsTable)
      .set({
        name,
        price: price !== undefined ? String(price) : undefined,
        active,
        trackStock,
        stockQuantity: stockQuantity !== undefined ? Number(stockQuantity) : undefined,
      })
      .where(and(eq(productsTable.id, Number(id)), eq(productsTable.userId, userId)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    return res.status(200).json(updated);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao atualizar produto" });
  }
};

export default UpdateProduct;
