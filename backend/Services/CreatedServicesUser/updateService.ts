// Services/updateService.ts
import type { Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { servicesTable } from "../../db/schema/services.js";

const UpdateService = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { title, description, duration, price, category, active } = req.body;

    const [updated] = await db
      .update(servicesTable)
      .set({
        title,
        description,
        duration,
        price: price !== undefined ? String(price) : undefined,
        category,
        active,
      })
      .where(and(eq(servicesTable.id, Number(id)), eq(servicesTable.userId, userId)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Serviço não encontrado" });
    }

    return res.status(200).json(updated);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao atualizar serviço" });
  }
};

export default UpdateService;