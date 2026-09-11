/**
 * Cascata de antecipação de horário.
 *
 * Quando o profissional finaliza um atendimento antes do previsto, o próximo
 * cliente da fila recebe um e-mail perguntando se quer adiantar. Cada aceite
 * gera a próxima oferta; uma recusa/timeout pula pro próximo candidato mantendo
 * a mesma janela livre. Uma oferta pendente por vez por cadeia.
 *
 * O estado da cadeia vive na tabela advance_offers — não há loop em memória.
 * Os disparos são:
 *  - startAdvanceCascade: ao marcar um atendimento como "completed" cedo
 *  - advanceAfterOffer:   quando uma oferta é aceita / recusada / expira
 */
import { and, eq, gte, lt, gt, asc, inArray } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db } from "../../db/index.js";
import { appointmentsTable } from "../../db/schema/appointments.js";
import { usersTable } from "../../db/schema/users.js";
import { customersTable } from "../../db/schema/customers.js";
import { advanceOffersTable } from "../../db/schema/advanceOffers.js";
import { clientAccountsTable } from "../../db/schema/clientAccounts.js";
import { validateSlot } from "../Availability/computeDaySlots.js";
import { sendAdvanceOfferEmail } from "../Email/advanceOfferEmails.js";
import { isSmtpConfigured } from "../Email/mailer.js";
import { EARLY_FINISH_MIN, MIN_GAIN_MIN, RESPONSE_WINDOW_MIN, appTzOffsetMin } from "./config.js";

const MIN = 60 * 1000;

const dayBounds = (d: Date) => {
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
};

interface Candidate {
  id: number;
  scheduledAt: Date;
  duration: number;
}

/**
 * Primeiro agendamento da fila que pode receber a oferta de `freeStart`:
 * - mesmo dia, depois de `afterStartAt`, status agendável, não é domicílio
 * - cliente tem e-mail e não desativou as ofertas
 * - adianta pelo menos MIN_GAIN_MIN
 * - o serviço cabe em `freeStart` sem colidir com nada (validateSlot)
 * - ainda não recebeu oferta hoje (máx. 1 por agendamento por dia)
 */
const findNextEligibleCandidate = async (
  userId: number,
  freeStart: Date,
  afterStartAt: Date
): Promise<Candidate | null> => {
  const { start: dayStart, end: dayEnd } = dayBounds(freeStart);
  const tz = appTzOffsetMin();

  const rows = await db
    .select({
      id: appointmentsTable.id,
      scheduledAt: appointmentsTable.scheduledAt,
      duration: appointmentsTable.duration,
      customerEmail: customersTable.email,
      accountEmail: clientAccountsTable.email,
      optOut: customersTable.advanceOffersOptOut,
    })
    .from(appointmentsTable)
    .innerJoin(customersTable, eq(appointmentsTable.customerId, customersTable.id))
    .leftJoin(clientAccountsTable, eq(customersTable.clientAccountId, clientAccountsTable.id))
    .where(
      and(
        eq(appointmentsTable.userId, userId),
        gt(appointmentsTable.scheduledAt, afterStartAt),
        lt(appointmentsTable.scheduledAt, dayEnd),
        gte(appointmentsTable.scheduledAt, dayStart),
        eq(appointmentsTable.isHomeService, false),
        inArray(appointmentsTable.status, ["scheduled", "confirmed"])
      )
    )
    .orderBy(asc(appointmentsTable.scheduledAt));

  for (const r of rows) {
    const scheduledAt = new Date(r.scheduledAt);
    if (scheduledAt.getTime() - freeStart.getTime() < MIN_GAIN_MIN * MIN) continue;
    if (!(r.customerEmail || r.accountEmail)) continue;
    if (r.optOut) continue;

    // Máx. 1 oferta por agendamento por dia (qualquer status).
    const [already] = await db
      .select({ id: advanceOffersTable.id })
      .from(advanceOffersTable)
      .where(
        and(
          eq(advanceOffersTable.appointmentId, r.id),
          gte(advanceOffersTable.sentAt, dayStart),
          lt(advanceOffersTable.sentAt, dayEnd)
        )
      )
      .limit(1);
    if (already) continue;

    // O serviço cabe em freeStart sem colidir com nada que esteja de pé?
    const conflict = await validateSlot(userId, freeStart, r.duration, tz, 0, r.id);
    if (conflict) continue;

    return { id: r.id, scheduledAt, duration: r.duration };
  }
  return null;
};

const createOffer = async (
  userId: number,
  originAppointmentId: number,
  candidate: Candidate,
  freeStart: Date,
  buffer: number
) => {
  const token = randomBytes(24).toString("hex");
  const now = new Date();
  const [offer] = await db
    .insert(advanceOffersTable)
    .values({
      userId,
      appointmentId: candidate.id,
      originAppointmentId,
      token,
      offeredStartAt: freeStart,
      previousStartAt: candidate.scheduledAt,
      holdMinutes: candidate.duration + buffer,
      status: "pending",
      sentAt: now,
      expiresAt: new Date(now.getTime() + RESPONSE_WINDOW_MIN * MIN),
    })
    .returning({ id: advanceOffersTable.id });

  if (offer) void sendAdvanceOfferEmail(offer.id);
};

const getBuffer = async (userId: number): Promise<number> => {
  const [u] = await db
    .select({ buffer: usersTable.appointmentBuffer })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  return u?.buffer ?? 0;
};

/** Dispara a cadeia a partir de um atendimento recém-finalizado cedo. */
export const startAdvanceCascade = async (originAppointmentId: number) => {
  try {
    // Sem SMTP não há como enviar as ofertas — não cria nada (evita reserva presa).
    if (!isSmtpConfigured()) return;

    const [origin] = await db
      .select({
        userId: appointmentsTable.userId,
        scheduledAt: appointmentsTable.scheduledAt,
        duration: appointmentsTable.duration,
        endedAt: appointmentsTable.endedAt,
        status: appointmentsTable.status,
      })
      .from(appointmentsTable)
      .where(eq(appointmentsTable.id, originAppointmentId))
      .limit(1);

    if (!origin || origin.status !== "completed" || !origin.endedAt) return;

    const scheduledEnd = new Date(origin.scheduledAt).getTime() + origin.duration * MIN;
    const endedAt = new Date(origin.endedAt);
    if (scheduledEnd - endedAt.getTime() < EARLY_FINISH_MIN * MIN) return; // não terminou cedo o bastante

    const buffer = await getBuffer(origin.userId);
    const freeStart = new Date(endedAt.getTime() + buffer * MIN);

    const candidate = await findNextEligibleCandidate(origin.userId, freeStart, new Date(origin.scheduledAt));
    if (candidate) await createOffer(origin.userId, originAppointmentId, candidate, freeStart, buffer);
  } catch (error) {
    console.error("ERRO startAdvanceCascade:", error);
  }
};

/**
 * Continua a cadeia depois que uma oferta foi resolvida.
 * `accepted` = o agendamento já foi movido para offer.offeredStartAt.
 */
export const advanceAfterOffer = async (
  offer: {
    id: number;
    userId: number;
    appointmentId: number;
    originAppointmentId: number;
    offeredStartAt: Date;
    previousStartAt: Date;
  },
  accepted: boolean
) => {
  try {
    const buffer = await getBuffer(offer.userId);

    let nextFreeStart: Date;
    if (accepted) {
      const [appt] = await db
        .select({ duration: appointmentsTable.duration })
        .from(appointmentsTable)
        .where(eq(appointmentsTable.id, offer.appointmentId))
        .limit(1);
      const dur = appt?.duration ?? 0;
      nextFreeStart = new Date(new Date(offer.offeredStartAt).getTime() + (dur + buffer) * MIN);
    } else {
      // Recusa/timeout: mesma janela livre, tenta o próximo da fila.
      nextFreeStart = new Date(offer.offeredStartAt);
    }

    const candidate = await findNextEligibleCandidate(
      offer.userId,
      nextFreeStart,
      new Date(offer.previousStartAt)
    );
    if (candidate) await createOffer(offer.userId, offer.originAppointmentId, candidate, nextFreeStart, buffer);
  } catch (error) {
    console.error("ERRO advanceAfterOffer:", error);
  }
};

/** Aborta ofertas pendentes que apontam para um agendamento específico. */
export const abortPendingOffersForAppointment = async (appointmentId: number) => {
  await db
    .update(advanceOffersTable)
    .set({ status: "aborted", respondedAt: new Date() })
    .where(and(eq(advanceOffersTable.appointmentId, appointmentId), eq(advanceOffersTable.status, "pending")));
};

/** Aborta a cadeia inteira iniciada por um atendimento (ex: "finalizar" desfeito). */
export const abortCascadeForOrigin = async (originAppointmentId: number) => {
  await db
    .update(advanceOffersTable)
    .set({ status: "aborted", respondedAt: new Date() })
    .where(
      and(
        eq(advanceOffersTable.originAppointmentId, originAppointmentId),
        eq(advanceOffersTable.status, "pending")
      )
    );
};
