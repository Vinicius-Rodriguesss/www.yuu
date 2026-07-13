// Services/deleteService.ts
import type { Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { servicesTable } from "../../db/schema/services.js";

const DeleteService = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const [deleted] = await db
      .delete(servicesTable)
      .where(and(eq(servicesTable.id, Number(id)), eq(servicesTable.userId, userId)))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: "Serviço não encontrado" });
    }

    return res.status(200).json({ message: "Serviço excluído com sucesso" });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao excluir serviço" });
  }
};

export default DeleteService;