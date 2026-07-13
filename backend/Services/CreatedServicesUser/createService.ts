// Services/createService.ts
import type { Request, Response } from "express";
import { db } from "../../db/index.js";
import { servicesTable } from "../../db/schema/services.js";

const CreateService = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { title, description, duration, price, category, active } = req.body;

    if (!title || !duration || !price || !category) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes" });
    }

    const [newService] = await db
      .insert(servicesTable)
      .values({
        userId,
        title,
        description,
        duration,
        price: String(price),
        category,
        active: active ?? true,
      })
      .returning();

    return res.status(201).json(newService);
  } catch (error) {
   console.error("ERRO DETALHADO:", error); // <-- adiciona isso
    return res.status(500).json({ error: "Erro ao criar serviço" });
  }
};

export default CreateService;