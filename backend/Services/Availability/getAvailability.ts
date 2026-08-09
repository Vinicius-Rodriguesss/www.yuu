/**
 * Service: GetAvailability
 *
 * GET /availability?date=YYYY-MM-DD&serviceId=1
 * Retorna a grade de horários do dia com o status de cada slot
 * (available, occupied, blocked, past, unavailable).
 */

import type { Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { servicesTable } from "../../db/schema/services.js";
import { computeDaySlots } from "./computeDaySlots.js";
import { resolveHomeServiceTravel } from "../Travel/estimateTravel.js";

const GetAvailability = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { date, serviceId, tz, homeService, customerId, addressId } = req.query;

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
        .where(and(eq(servicesTable.id, Number(serviceId)), eq(servicesTable.userId, userId)))
        .limit(1);
      if (!service) {
        return res.status(404).json({ error: "Serviço não encontrado" });
      }
      serviceDuration = service.duration;
    }

    // Atendimento a domicílio: soma o deslocamento no tempo ocupado
    let travelMinutes = 0;
    let travelUnavailable = false;
    let travelKm: number | null = null;
    let travelCost = 0;
    let exceedsMaxDistance = false;
    let maxDistanceKm: number | null = null;
    if (homeService === "1" && customerId) {
      const travel = await resolveHomeServiceTravel(
        userId,
        Number(customerId),
        addressId ? Number(addressId) : undefined
      );
      if (travel.minutes === null) {
        travelUnavailable = true;
      } else {
        travelMinutes = travel.minutes;
      }
      travelKm = travel.km;
      travelCost = travel.travelCost;
      exceedsMaxDistance = travel.exceedsMaxDistance;
      maxDistanceKm = travel.maxDistanceKm;
    }

    const availability = await computeDaySlots(
      userId,
      parsed,
      serviceDuration,
      tzOffsetMin,
      // ida e volta: reserva tempo pro profissional voltar antes do próximo horário
      travelMinutes * 2
    );
    return res.status(200).json({
      ...availability,
      travelMinutes,
      travelUnavailable,
      travelKm,
      travelCost,
      exceedsMaxDistance,
      maxDistanceKm,
    });
  } catch (error) {
    console.error("ERRO AVAILABILITY:", error);
    return res.status(500).json({ error: "Erro ao calcular disponibilidade" });
  }
};

export default GetAvailability;
