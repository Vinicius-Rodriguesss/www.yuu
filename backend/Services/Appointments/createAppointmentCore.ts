/**
 * Núcleo de criação de agendamento — usado tanto pelo fluxo autenticado
 * (profissional criando pelo painel) quanto pelo fluxo público (cliente
 * final agendando sozinho pelo link). Mantém uma única fonte de verdade
 * para a trava anti-concorrência e a revalidação de disponibilidade.
 */
import { sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { appointmentsTable } from "../../db/schema/appointments.js";
import { appointmentProductsTable } from "../../db/schema/appointmentProducts.js";
import { validateSlot } from "../Availability/computeDaySlots.js";
import { sendAppointmentConfirmationEmails } from "../Email/appointmentEmails.js";
import { decrementStock, InsufficientStockError } from "../Products/stock.js";
import type { ResolvedAppointmentProduct } from "./resolveAppointmentProducts.js";

interface CreateAppointmentParams {
  userId: number;
  customerId: number;
  serviceId: number;
  duration: number;
  price: string;
  products: ResolvedAppointmentProduct[];
  scheduledAt: Date;
  tzOffsetMin: number;
  notes: string | null;
  paymentStatus: string;
  isHomeService: boolean;
  travelMinutes: number;
  travelDistanceKm: number;
  travelCost: number;
  customerAddressId: number | null;
}

export const createAppointmentCore = async (params: CreateAppointmentParams) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Advisory lock por profissional: serializa agendamentos concorrentes.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${params.userId})`);

      const conflict = await validateSlot(
        params.userId,
        params.scheduledAt,
        params.duration,
        params.tzOffsetMin,
        // ida e volta: reserva tempo pro profissional voltar antes do próximo horário
        params.travelMinutes * 2
      );
      if (conflict) {
        return { error: conflict } as const;
      }

      // Decrementa o estoque antes de criar o agendamento — se faltar produto,
      // lança e derruba a transação inteira (nada é criado).
      if (params.products.length > 0) {
        await decrementStock(tx, params.userId, params.products);
      }

      const [created] = await tx
        .insert(appointmentsTable)
        .values({
          userId: params.userId,
          customerId: params.customerId,
          serviceId: params.serviceId,
          scheduledAt: params.scheduledAt,
          duration: params.duration,
          price: params.price,
          status: "scheduled",
          paymentStatus: params.paymentStatus === "paid" ? "paid" : "unpaid",
          notes: params.notes,
          isHomeService: params.isHomeService,
          travelMinutes: params.travelMinutes,
          travelDistanceKm: String(params.travelDistanceKm),
          travelCost: String(params.travelCost),
          customerAddressId: params.customerAddressId,
        })
        .returning();

      if (params.products.length > 0 && created) {
        await tx.insert(appointmentProductsTable).values(
          params.products.map((p) => ({
            appointmentId: created.id,
            productId: p.productId,
            name: p.name,
            unitPrice: p.unitPrice,
            quantity: p.quantity,
          }))
        );
      }

      return { appointment: created } as const;
    });

    // Email de confirmação (cliente + profissional) — fora da transação e sem
    // await: falha de SMTP nunca afeta a criação do agendamento.
    if (!("error" in result) && result.appointment) {
      void sendAppointmentConfirmationEmails(result.appointment.id);
    }

    return result;
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return { error: error.message } as const;
    }
    throw error;
  }
};
