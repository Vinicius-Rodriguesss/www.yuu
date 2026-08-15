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
import { productsTable } from "../../db/schema/products.js";
import { addressesTable } from "../../db/schema/addresses.js";

const GetPublicProfile = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const [user] = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        businessType: usersTable.businessType,
        homeService: usersTable.homeService,
        phone: usersTable.phone,
      })
      .from(usersTable)
      .where(eq(usersTable.publicSlug, String(slug)))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "Página não encontrada" });
    }

    const [address] = await db
      .select({
        street: addressesTable.street,
        number: addressesTable.number,
        complement: addressesTable.complement,
        neighborhood: addressesTable.neighborhood,
        city: addressesTable.city,
        state: addressesTable.state,
      })
      .from(addressesTable)
      .where(eq(addressesTable.userId, user.id))
      .limit(1);

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

    const products = await db
      .select({
        id: productsTable.id,
        name: productsTable.name,
        price: productsTable.price,
      })
      .from(productsTable)
      .where(and(eq(productsTable.userId, user.id), eq(productsTable.active, true)));

    return res.status(200).json({
      name: user.name,
      businessType: user.businessType,
      homeService: user.homeService,
      phone: user.phone,
      address: address ?? null,
      services,
      products,
    });
  } catch (error) {
    console.error("ERRO PUBLIC PROFILE:", error);
    return res.status(500).json({ error: "Erro ao carregar página pública" });
  }
};

export default GetPublicProfile;
