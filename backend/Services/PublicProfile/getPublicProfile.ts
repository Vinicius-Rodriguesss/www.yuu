/**
 * Service: GetPublicProfile
 *
 * GET /public/:slug — SEM autenticação.
 * Dados públicos do profissional para a futura página de agendamento
 * do cliente: nome, tipo de negócio e serviços ativos.
 */

import type { Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { usersTable } from "../../db/schema/users.js";
import { servicesTable } from "../../db/schema/services.js";

const GetPublicProfile = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const [user] = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        businessType: usersTable.businessType,
        homeService: usersTable.homeService,
      })
      .from(usersTable)
      .where(eq(usersTable.publicSlug, String(slug)))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "Página não encontrada" });
    }

    const services = await db
      .select({
        id: servicesTable.id,
        title: servicesTable.title,
        description: servicesTable.description,
        duration: servicesTable.duration,
        price: servicesTable.price,
        category: servicesTable.category,
      })
      .from(servicesTable)
      .where(and(eq(servicesTable.userId, user.id), eq(servicesTable.active, true)));

    return res.status(200).json({
      name: user.name,
      businessType: user.businessType,
      homeService: user.homeService,
      services,
    });
  } catch (error) {
    console.error("ERRO PUBLIC PROFILE:", error);
    return res.status(500).json({ error: "Erro ao carregar página pública" });
  }
};

export default GetPublicProfile;
