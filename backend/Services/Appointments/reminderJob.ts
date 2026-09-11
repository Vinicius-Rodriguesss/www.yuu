/**
 * Job de lembrete: a cada minuto procura agendamentos que começam em até
 * 20 minutos e ainda não receberam lembrete, e avisa profissional e cliente
 * por email (appointmentEmails.ts).
 *
 * Fuso: os horários são gravados como "hora de parede" no frame UTC, então
 * o "agora" precisa ser convertido para a hora de parede local do negócio.
 * Como o produto é Brasil, usa APP_TZ_OFFSET_MIN (padrão -180 = Brasília,
 * sem horário de verão desde 2019). Configurável no .env se necessário.
 */
import { and, lte, gte, isNull, inArray, lt } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { appointmentsTable } from "../../db/schema/appointments.js";
import { advanceOffersTable } from "../../db/schema/advanceOffers.js";
import { sendAppointmentReminderEmails } from "../Email/appointmentEmails.js";
import { advanceAfterOffer } from "../AdvanceOffers/cascade.js";
import { isSmtpConfigured } from "../Email/mailer.js";

const REMINDER_MINUTES = 20;
const CHECK_INTERVAL_MS = 60 * 1000;

const tzOffsetMin = () => {
  const v = Number(process.env.APP_TZ_OFFSET_MIN);
  return isNaN(v) ? -180 : v;
};

/** "Agora" como hora de parede local, no frame UTC (mesmo frame dos agendamentos). */
const nowWall = () => new Date(Date.now() + tzOffsetMin() * 60 * 1000);

let running = false;

const tick = async () => {
  if (running) return; // evita sobreposição se uma rodada demorar
  running = true;
  try {
    const start = nowWall();
    const end = new Date(start.getTime() + REMINDER_MINUTES * 60 * 1000);

    const due = await db
      .select({ id: appointmentsTable.id })
      .from(appointmentsTable)
      .where(
        and(
          gte(appointmentsTable.scheduledAt, start),
          lte(appointmentsTable.scheduledAt, end),
          isNull(appointmentsTable.reminderSentAt),
          inArray(appointmentsTable.status, ["scheduled", "confirmed"])
        )
      );

    for (const appt of due) {
      // Marca ANTES de enviar: garante no máximo 1 lembrete por agendamento,
      // mesmo que o envio falhe (melhor não repetir do que spammar).
      await db
        .update(appointmentsTable)
        .set({ reminderSentAt: new Date() })
        .where(eq(appointmentsTable.id, appt.id));

      await sendAppointmentReminderEmails(appt.id);
    }

    // -- Ofertas de antecipação vencidas: trata como recusa e segue a cadeia ---
    // O prazo de resposta é uma duração real (10 min), então compara com now() real.
    const staleOffers = await db
      .select({
        id: advanceOffersTable.id,
        userId: advanceOffersTable.userId,
        appointmentId: advanceOffersTable.appointmentId,
        originAppointmentId: advanceOffersTable.originAppointmentId,
        offeredStartAt: advanceOffersTable.offeredStartAt,
        previousStartAt: advanceOffersTable.previousStartAt,
      })
      .from(advanceOffersTable)
      .where(and(eq(advanceOffersTable.status, "pending"), lt(advanceOffersTable.expiresAt, new Date())));

    for (const offer of staleOffers) {
      const [row] = await db
        .update(advanceOffersTable)
        .set({ status: "expired", respondedAt: new Date() })
        .where(and(eq(advanceOffersTable.id, offer.id), eq(advanceOffersTable.status, "pending")))
        .returning({ id: advanceOffersTable.id });
      if (row) await advanceAfterOffer(offer, false);
    }
  } catch (error) {
    console.error("ERRO REMINDER JOB:", error);
  } finally {
    running = false;
  }
};

export const startReminderJob = () => {
  if (!isSmtpConfigured()) {
    console.warn("Lembretes de agendamento desativados: SMTP não configurado");
    return;
  }
  setInterval(tick, CHECK_INTERVAL_MS);
  console.log(`Lembretes de agendamento ativos (${REMINDER_MINUTES} min antes, checagem a cada 60s)`);
};
