/**
 * Service: GetPublicAvailability
 *
 * GET /public/:slug/availability — SEM autenticação.
 * Mesma grade de horários do painel interno, mas resolvendo o profissional
 * pelo slug público em vez de pelo token.
 */
import type { Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { usersTable } from "../../db/schema/users.js";
import { servicesTable } from "../../db/schema/services.js";
import { computeDaySlots } from "../Availability/computeDaySlots.js";
import { resolveHomeServiceTravel } from "../Travel/estimateTravel.js";

const GetPublicAvailability = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { date, serviceId, tz, homeService, customerId, addressId } = req.query;

    const [user] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.publicSlug, String(slug)))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "Página não encontrada" });
    }

    if (!date) {
      return res.status(400).json({ error: "Parâmetro 'date' é obrigatório (YYYY-MM-DD)" });
    }

    const [y, m, d] = String(date).split("-").map(Number);
    if (!y || !m || !d) {
      return res.status(400).json({ error: "Data inválida" });
    }
    const parsed = new Date(Date.UTC(y, m - 1, d));
    const tzOffsetMin = tz !== undefined && !isNaN(Number(tz)) ? Number(tz) : 0;

    let serviceDuration: number | undefined;
    if (serviceId) {
      const [service] = await db
        .select({ duration: servicesTable.duration })
        .from(servicesTable)
        .where(and(eq(servicesTable.id, Number(serviceId)), eq(servicesTable.userId, user.id)))
        .limit(1);
      if (!service) {
        return res.status(404).json({ error: "Serviço não encontrado" });
      }
      serviceDuration = service.duration;
    }

    let travelMinutes = 0;
    let travelUnavailable = false;
    if (homeService === "1" && customerId) {
      const travel = await resolveHomeServiceTravel(
        user.id,
        Number(customerId),
        addressId ? Number(addressId) : undefined
      );
      if (travel.minutes === null) {
        travelUnavailable = true;
      } else {
        travelMinutes = travel.minutes;
      }
    }

    // ida e volta: reserva tempo pro profissional voltar antes do próximo horário
    const availability = await computeDaySlots(user.id, parsed, serviceDuration, tzOffsetMin, travelMinutes * 2);
    return res.status(200).json({ ...availability, travelMinutes, travelUnavailable });
  } catch (error) {
    console.error("ERRO PUBLIC AVAILABILITY:", error);
    return res.status(500).json({ error: "Erro ao calcular disponibilidade" });
  }
};

export default GetPublicAvailability;
