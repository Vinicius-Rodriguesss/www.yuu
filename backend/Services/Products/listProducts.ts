// Services/Products/listProducts.ts
import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { productsTable } from "../../db/schema/products.js";

const ListProducts = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const products = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.userId, userId));

    return res.status(200).json(products);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar produtos" });
  }
};

export default ListProducts;
