// Services/Products/toggleProductStatus.ts
import type { Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { productsTable } from "../../db/schema/products.js";

const ToggleProductStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { active } = req.body;

    const [updated] = await db
      .update(productsTable)
      .set({ active })
      .where(and(eq(productsTable.id, Number(id)), eq(productsTable.userId, userId)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    return res.status(200).json(updated);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao alterar status do produto" });
  }
};

export default ToggleProductStatus;
