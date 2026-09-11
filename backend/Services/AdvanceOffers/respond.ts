// Services/AdvanceOffers/respond.ts
// Páginas públicas (sem login) abertas pelos links do e-mail de antecipação.
// GET mostra; POST altera — assim scanners de e-mail não "respondem" sozinhos.
import type { Request, Response } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { advanceOffersTable } from "../../db/schema/advanceOffers.js";
import { appointmentsTable } from "../../db/schema/appointments.js";
import { customersTable } from "../../db/schema/customers.js";
import { servicesTable } from "../../db/schema/services.js";
import { validateSlot } from "../Availability/computeDaySlots.js";
import { advanceOfferResultPage, advanceOfferDecisionPage } from "../Email/templates.js";
import {
  sendAppointmentRescheduledClientEmail,
} from "../Email/appointmentEmails.js";
import { sendAdvanceOfferAcceptedEmail } from "../Email/advanceOfferEmails.js";
import { advanceAfterOffer } from "./cascade.js";
import { appTzOffsetMin, publicApiBaseUrl } from "./config.js";

const html = (res: Response, status: number, body: string) =>
  res.status(status).set("Content-Type", "text/html; charset=utf-8").send(body);

const wallLabel = (d: Date) =>
  d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }) +
  " às " +
  d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

const loadOffer = async (rawToken: string | string[] | undefined) => {
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
  if (!token) return null;
  const [row] = await db
    .select({
      id: advanceOffersTable.id,
      userId: advanceOffersTable.userId,
      appointmentId: advanceOffersTable.appointmentId,
      originAppointmentId: advanceOffersTable.originAppointmentId,
      offeredStartAt: advanceOffersTable.offeredStartAt,
      previousStartAt: advanceOffersTable.previousStartAt,
      status: advanceOffersTable.status,
      expiresAt: advanceOffersTable.expiresAt,
      clientName: customersTable.name,
      customerId: customersTable.id,
      serviceTitle: servicesTable.title,
    })
    .from(advanceOffersTable)
    .innerJoin(appointmentsTable, eq(advanceOffersTable.appointmentId, appointmentsTable.id))
    .innerJoin(customersTable, eq(appointmentsTable.customerId, customersTable.id))
    .innerJoin(servicesTable, eq(appointmentsTable.serviceId, servicesTable.id))
    .where(eq(advanceOffersTable.token, token))
    .limit(1);
  return row ?? null;
};

/** Troca atômica de status: só "vence" quem pega a linha ainda pending. */
const claim = async (offerId: number, next: "accepted" | "declined" | "expired" | "aborted") => {
  const [row] = await db
    .update(advanceOffersTable)
    .set({ status: next, respondedAt: new Date() })
    .where(and(eq(advanceOffersTable.id, offerId), eq(advanceOffersTable.status, "pending")))
    .returning({ id: advanceOffersTable.id });
  return Boolean(row);
};

const alreadyPage = (res: Response) =>
  html(
    res,
    200,
    advanceOfferResultPage(
      "Oferta encerrada",
      "Esta oferta de antecipação já foi respondida ou expirou. Seu horário original continua valendo.",
      "info"
    )
  );

const notFoundPage = (res: Response) =>
  html(res, 404, advanceOfferResultPage("Link inválido", "Não encontramos esta oferta.", "error"));

// GET /public/advance-offer/:token — página com os botões
export const showAdvanceOfferPage = async (req: Request, res: Response) => {
  try {
    const offer = await loadOffer(req.params.token);
    if (!offer) return notFoundPage(res);
    if (offer.status !== "pending" || new Date(offer.expiresAt) < new Date()) return alreadyPage(res);

    const base = `${publicApiBaseUrl()}/public/advance-offer/${req.params.token}`;
    return html(
      res,
      200,
      advanceOfferDecisionPage({
        title: "Adiantar seu horário",
        clientName: offer.clientName,
        serviceTitle: offer.serviceTitle,
        currentLabel: wallLabel(new Date(offer.previousStartAt)),
        newLabel: wallLabel(new Date(offer.offeredStartAt)),
        acceptAction: `${base}/accept`,
        declineAction: `${base}/decline`,
      })
    );
  } catch (error) {
    console.error("ERRO showAdvanceOfferPage:", error);
    return html(res, 500, advanceOfferResultPage("Erro", "Não foi possível carregar a oferta.", "error"));
  }
};

// POST /public/advance-offer/:token/accept
export const acceptAdvanceOffer = async (req: Request, res: Response) => {
  try {
    const offer = await loadOffer(req.params.token);
    if (!offer) return notFoundPage(res);
    if (offer.status !== "pending") return alreadyPage(res);

    if (new Date(offer.expiresAt) < new Date()) {
      if (await claim(offer.id, "expired")) void advanceAfterOffer(offer, false);
      return alreadyPage(res);
    }

    const [appt] = await db
      .select({
        status: appointmentsTable.status,
        scheduledAt: appointmentsTable.scheduledAt,
        duration: appointmentsTable.duration,
      })
      .from(appointmentsTable)
      .where(eq(appointmentsTable.id, offer.appointmentId))
      .limit(1);

    const stillBookable = appt && (appt.status === "scheduled" || appt.status === "confirmed");
    const notMoved = appt && new Date(appt.scheduledAt).getTime() === new Date(offer.previousStartAt).getTime();

    if (!stillBookable || !notMoved) {
      if (await claim(offer.id, "aborted")) void advanceAfterOffer(offer, false);
      return html(
        res,
        200,
        advanceOfferResultPage(
          "Não foi possível adiantar",
          "Seu agendamento mudou desde que a oferta foi enviada. Seu horário atual continua valendo.",
          "info"
        )
      );
    }

    const conflict = await validateSlot(
      offer.userId,
      new Date(offer.offeredStartAt),
      appt!.duration,
      appTzOffsetMin(),
      0,
      offer.appointmentId
    );
    if (conflict) {
      if (await claim(offer.id, "aborted")) void advanceAfterOffer(offer, false);
      return html(
        res,
        200,
        advanceOfferResultPage(
          "Horário não está mais livre",
          "Esse horário mais cedo acabou de ser ocupado. Seu horário atual continua garantido.",
          "info"
        )
      );
    }

    if (!(await claim(offer.id, "accepted"))) return alreadyPage(res);

    await db
      .update(appointmentsTable)
      .set({ scheduledAt: new Date(offer.offeredStartAt), updatedAt: new Date() })
      .where(eq(appointmentsTable.id, offer.appointmentId));

    void sendAppointmentRescheduledClientEmail(offer.appointmentId);
    void sendAdvanceOfferAcceptedEmail(offer.id);
    void advanceAfterOffer(offer, true);

    return html(
      res,
      200,
      advanceOfferResultPage(
        "Horário adiantado!",
        `Pronto, ${offer.clientName}. Seu atendimento agora é <strong>${wallLabel(new Date(offer.offeredStartAt))}</strong>. Você vai receber um e-mail de confirmação.`,
        "ok"
      )
    );
  } catch (error) {
    console.error("ERRO acceptAdvanceOffer:", error);
    return html(res, 500, advanceOfferResultPage("Erro", "Não foi possível adiantar agora.", "error"));
  }
};

// POST /public/advance-offer/:token/decline
export const declineAdvanceOffer = async (req: Request, res: Response) => {
  try {
    const offer = await loadOffer(req.params.token);
    if (!offer) return notFoundPage(res);
    if (offer.status !== "pending") return alreadyPage(res);

    if (!(await claim(offer.id, "declined"))) return alreadyPage(res);
    void advanceAfterOffer(offer, false);

    return html(
      res,
      200,
      advanceOfferResultPage(
        "Horário mantido",
        `Tudo certo, ${offer.clientName}. Seu atendimento continua <strong>${wallLabel(new Date(offer.previousStartAt))}</strong>.`,
        "ok"
      )
    );
  } catch (error) {
    console.error("ERRO declineAdvanceOffer:", error);
    return html(res, 500, advanceOfferResultPage("Erro", "Não foi possível registrar sua resposta.", "error"));
  }
};

// GET /public/advance-offer/:token/unsubscribe — confirmação
export const showUnsubscribePage = async (req: Request, res: Response) => {
  const offer = await loadOffer(req.params.token);
  if (!offer) return notFoundPage(res);
  const action = `${publicApiBaseUrl()}/public/advance-offer/${req.params.token}/unsubscribe`;
  return html(
    res,
    200,
    `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Desativar ofertas de antecipação</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:48px 16px;"><tr><td align="center">
    <table width="440" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #ececec;">
      <tr><td style="background:#000000;padding:20px 32px;"><span style="color:#ffffff;font-size:18px;font-weight:700;">ai.yuu</span></td></tr>
      <tr><td style="padding:32px;">
        <h1 style="margin:0 0 12px;font-size:18px;color:#1a1a1a;">Não receber ofertas de antecipação</h1>
        <p style="margin:0 0 20px;font-size:14px;color:#37352f;line-height:1.5;">Você deixará de receber e-mails oferecendo adiantar seus horários com este profissional. Seus agendamentos não mudam.</p>
        <form method="POST" action="${action}"><button type="submit" style="padding:12px 22px;background:#000000;color:#ffffff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;">Confirmar</button></form>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`
  );
};

// POST /public/advance-offer/:token/unsubscribe
export const confirmUnsubscribe = async (req: Request, res: Response) => {
  try {
    const offer = await loadOffer(req.params.token);
    if (!offer) return notFoundPage(res);

    await db
      .update(customersTable)
      .set({ advanceOffersOptOut: true, updatedAt: new Date() })
      .where(eq(customersTable.id, offer.customerId));

    // Se esta oferta ainda estava pendente, encerra e segue a cadeia pro próximo.
    if (offer.status === "pending" && (await claim(offer.id, "declined"))) {
      void advanceAfterOffer(offer, false);
    }

    return html(
      res,
      200,
      advanceOfferResultPage(
        "Preferência salva",
        "Você não vai mais receber ofertas para antecipar seus horários com este profissional.",
        "ok"
      )
    );
  } catch (error) {
    console.error("ERRO confirmUnsubscribe:", error);
    return html(res, 500, advanceOfferResultPage("Erro", "Não foi possível salvar sua preferência.", "error"));
  }
};
