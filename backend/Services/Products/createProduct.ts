// Services/Products/createProduct.ts
import type { Request, Response } from "express";
import { db } from "../../db/index.js";
import { productsTable } from "../../db/schema/products.js";

const CreateProduct = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { name, price, active } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes" });
    }

    const [newProduct] = await db
      .insert(productsTable)
      .values({
        userId,
        name,
        price: String(price),
        active: active ?? true,
      })
      .returning();

    return res.status(201).json(newProduct);
  } catch (error) {
    console.error("ERRO DETALHADO:", error);
    return res.status(500).json({ error: "Erro ao criar produto" });
  }
};

export default CreateProduct;
