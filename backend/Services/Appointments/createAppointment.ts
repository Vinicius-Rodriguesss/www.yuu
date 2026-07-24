/**
 * Service: CreateAppointment
 *
 * Cria um agendamento com validação completa de disponibilidade:
 * - jornada de trabalho (dia/horário do expediente)
 * - intervalo da agenda e delay entre atendimentos
 * - conflitos com outros agendamentos e bloqueios
 * - horários passados
 *
 * Proteção contra concorrência: advisory lock por profissional dentro de
 * transação — dois agendamentos simultâneos no mesmo horário nunca passam.
 *
 * duration e price são snapshots do serviço no momento do agendamento.
 */

import type { Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { servicesTable } from "../../db/schema/services.js";
import { customersTable } from "../../db/schema/customers.js";
import { resolveHomeServiceTravel } from "../Travel/estimateTravel.js";
import { createAppointmentCore } from "./createAppointmentCore.js";

const CreateAppointment = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { customerId, serviceId, scheduledAt, notes, tzOffsetMin, isHomeService, customerAddressId } = req.body;
    const tzOffset = !isNaN(Number(tzOffsetMin)) ? Number(tzOffsetMin) : 0;
    const homeService = Boolean(isHomeService);

    if (!customerId || !serviceId || !scheduledAt) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes" });
    }

    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({ error: "Data/hora inválida" });
    }

    // Serviço do próprio profissional (snapshot de duration/price)
    const [service] = await db
      .select({ duration: servicesTable.duration, price: servicesTable.price })
      .from(servicesTable)
      .where(and(eq(servicesTable.id, Number(serviceId)), eq(servicesTable.userId, userId)))
      .limit(1);

    if (!service) {
      return res.status(404).json({ error: "Serviço não encontrado" });
    }

    // Cliente precisa pertencer ao profissional
    const [customer] = await db
      .select({ id: customersTable.id })
      .from(customersTable)
      .where(and(eq(customersTable.id, Number(customerId)), eq(customersTable.userId, userId)))
      .limit(1);

    if (!customer) {
      return res.status(404).json({ error: "Cliente não encontrado" });
    }

    // Domicílio: endereço do cliente é obrigatório e o deslocamento entra no tempo ocupado
    let travelMinutes = 0;
    let travelDistanceKm = 0;
    let travelCost = 0;
    let resolvedAddressId: number | null = null;
    if (homeService) {
      const travel = await resolveHomeServiceTravel(
        userId,
        Number(customerId),
        customerAddressId ? Number(customerAddressId) : undefined
      );
      if (!travel.addressId) {
        return res.status(400).json({
          error: "Atendimento a domicílio exige um endereço cadastrado para o cliente",
        });
      }
      if (travel.exceedsMaxDistance) {
        return res.status(400).json({
          error: `Endereço fora do raio de atendimento a domicílio (máximo ${travel.maxDistanceKm} km)`,
        });
      }
      resolvedAddressId = travel.addressId;
      // Se a estimativa falhar (API fora do ar), segue com 0 e registra no log
      travelMinutes = travel.minutes ?? 0;
      travelDistanceKm = travel.km ?? 0;
      travelCost = travel.travelCost;
      if (travel.minutes === null) {
        console.warn(`Deslocamento não calculado para agendamento (cliente ${customerId})`);
      }
    }

    const result = await createAppointmentCore({
      userId,
      customerId: Number(customerId),
      serviceId: Number(serviceId),
      duration: service.duration,
      price: service.price,
      scheduledAt: scheduledDate,
      tzOffsetMin: tzOffset,
      notes: notes || null,
      isHomeService: homeService,
      travelMinutes,
      travelDistanceKm,
      travelCost,
      customerAddressId: resolvedAddressId,
    });

    if ("error" in result) {
      return res.status(409).json({ error: result.error });
    }

    return res.status(201).json(result.appointment);
  } catch (error) {
    console.error("ERRO DETALHADO:", error);
    return res.status(500).json({ error: "Erro ao criar agendamento" });
  }
};

export default CreateAppointment;
