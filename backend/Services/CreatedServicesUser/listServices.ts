// Services/listServices.ts
import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { servicesTable } from "../../db/schema/services.js";

const ListServices = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const services = await db
      .select()
      .from(servicesTable)
      .where(eq(servicesTable.userId, userId));

    return res.status(200).json(services);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar serviços" });
  }
};

export default ListServices;