/**
 * E-mails do fluxo de antecipação de horário:
 * - oferta para o cliente (com links de aceitar / manter / opt-out)
 * - aviso para o profissional quando o cliente aceita
 *
 * Envio sempre "fire and forget": falha de SMTP nunca derruba o fluxo.
 */
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { advanceOffersTable } from "../../db/schema/advanceOffers.js";
import { appointmentsTable } from "../../db/schema/appointments.js";
import { usersTable } from "../../db/schema/users.js";
import { customersTable } from "../../db/schema/customers.js";
import { servicesTable } from "../../db/schema/services.js";
import { clientAccountsTable } from "../../db/schema/clientAccounts.js";
import { sendMail, isSmtpConfigured } from "./mailer.js";
import {
  advanceOfferEmailTemplate,
  advanceOfferAcceptedProfessionalTemplate,
} from "./templates.js";
import { publicApiBaseUrl } from "../AdvanceOffers/config.js";

const wallLabel = (d: Date) =>
  d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }) +
  " às " +
  d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

const loadOfferData = async (offerId: number) => {
  const [row] = await db
    .select({
      token: advanceOffersTable.token,
      offeredStartAt: advanceOffersTable.offeredStartAt,
      previousStartAt: advanceOffersTable.previousStartAt,
      professionalName: usersTable.name,
      professionalEmail: usersTable.email,
      clientName: customersTable.name,
      clientEmail: customersTable.email,
      accountEmail: clientAccountsTable.email,
      serviceTitle: servicesTable.title,
    })
    .from(advanceOffersTable)
    .innerJoin(appointmentsTable, eq(advanceOffersTable.appointmentId, appointmentsTable.id))
    .innerJoin(usersTable, eq(appointmentsTable.userId, usersTable.id))
    .innerJoin(customersTable, eq(appointmentsTable.customerId, customersTable.id))
    .innerJoin(servicesTable, eq(appointmentsTable.serviceId, servicesTable.id))
    .leftJoin(clientAccountsTable, eq(customersTable.clientAccountId, clientAccountsTable.id))
    .where(eq(advanceOffersTable.id, offerId))
    .limit(1);
  return row ?? null;
};

/** Oferta de antecipação para o cliente. Chame sem await. */
export const sendAdvanceOfferEmail = async (offerId: number) => {
  if (!isSmtpConfigured()) return;
  try {
    const d = await loadOfferData(offerId);
    if (!d) return;
    const to = d.clientEmail || d.accountEmail || null;
    if (!to) return;

    const base = `${publicApiBaseUrl()}/public/advance-offer/${d.token}`;
    const tpl = advanceOfferEmailTemplate({
      clientName: d.clientName,
      professionalName: d.professionalName,
      serviceTitle: d.serviceTitle,
      currentLabel: wallLabel(new Date(d.previousStartAt)),
      newLabel: wallLabel(new Date(d.offeredStartAt)),
      respondUrl: base,
      unsubscribeUrl: `${base}/unsubscribe`,
    });
    await sendMail(to, tpl.subject, tpl.html);
  } catch (error) {
    console.warn("Falha no e-mail de oferta de antecipação:", error instanceof Error ? error.message : error);
  }
};

/** Aviso ao profissional de que o cliente aceitou adiantar. Chame sem await. */
export const sendAdvanceOfferAcceptedEmail = async (offerId: number) => {
  if (!isSmtpConfigured()) return;
  try {
    const d = await loadOfferData(offerId);
    if (!d || !d.professionalEmail) return;
    const tpl = advanceOfferAcceptedProfessionalTemplate({
      clientName: d.clientName,
      serviceTitle: d.serviceTitle,
      newLabel: wallLabel(new Date(d.offeredStartAt)),
    });
    await sendMail(d.professionalEmail, tpl.subject, tpl.html);
  } catch (error) {
    console.warn("Falha no e-mail de antecipação aceita:", error instanceof Error ? error.message : error);
  }
};
