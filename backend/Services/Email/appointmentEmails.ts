/**
 * Emails de agendamento: confirmação (na criação) e lembrete (20 min antes).
 *
 * O email do cliente final vem de customers.email ou, se vazio, do email da
 * conta global (client_accounts.email) — ambos opcionais. O do profissional
 * vem de users.email. Envio sempre "fire and forget": falha de SMTP nunca
 * derruba a criação do agendamento.
 */
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { appointmentsTable } from "../../db/schema/appointments.js";
import { usersTable } from "../../db/schema/users.js";
import { customersTable } from "../../db/schema/customers.js";
import { servicesTable } from "../../db/schema/services.js";
import { clientAccountsTable } from "../../db/schema/clientAccounts.js";
import { sendMail, isSmtpConfigured } from "./mailer.js";
import {
  appointmentConfirmedClientTemplate,
  appointmentConfirmedProfessionalTemplate,
  appointmentReminderClientTemplate,
  appointmentReminderProfessionalTemplate,
  type AppointmentEmailInfo,
} from "./templates.js";

export interface AppointmentEmailData {
  info: AppointmentEmailInfo;
  clientEmail: string | null;
  professionalEmail: string | null;
}

/** Horários são "hora de parede" no frame UTC — formata com timeZone UTC. */
const wallDateLabel = (d: Date) =>
  d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

const wallTimeLabel = (d: Date) =>
  d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

export const loadAppointmentEmailData = async (appointmentId: number): Promise<AppointmentEmailData | null> => {
  const [row] = await db
    .select({
      scheduledAt: appointmentsTable.scheduledAt,
      isHomeService: appointmentsTable.isHomeService,
      professionalName: usersTable.name,
      professionalEmail: usersTable.email,
      customerName: customersTable.name,
      customerEmail: customersTable.email,
      accountEmail: clientAccountsTable.email,
      serviceTitle: servicesTable.title,
    })
    .from(appointmentsTable)
    .innerJoin(usersTable, eq(appointmentsTable.userId, usersTable.id))
    .innerJoin(customersTable, eq(appointmentsTable.customerId, customersTable.id))
    .innerJoin(servicesTable, eq(appointmentsTable.serviceId, servicesTable.id))
    .leftJoin(clientAccountsTable, eq(customersTable.clientAccountId, clientAccountsTable.id))
    .where(eq(appointmentsTable.id, appointmentId))
    .limit(1);

  if (!row) return null;

  return {
    info: {
      clientName: row.customerName,
      professionalName: row.professionalName,
      serviceTitle: row.serviceTitle,
      dateLabel: wallDateLabel(row.scheduledAt),
      timeLabel: wallTimeLabel(row.scheduledAt),
      isHomeService: row.isHomeService,
    },
    clientEmail: row.customerEmail || row.accountEmail || null,
    professionalEmail: row.professionalEmail || null,
  };
};

const trySend = async (to: string | null, tpl: { subject: string; html: string }, label: string) => {
  if (!to) return;
  try {
    await sendMail(to, tpl.subject, tpl.html);
  } catch (error) {
    console.warn(`Falha ao enviar email (${label}) para ${to}:`, error instanceof Error ? error.message : error);
  }
};

/** Confirmação de agendamento — chame sem await (fire and forget). */
export const sendAppointmentConfirmationEmails = async (appointmentId: number) => {
  if (!isSmtpConfigured()) return;
  try {
    const data = await loadAppointmentEmailData(appointmentId);
    if (!data) return;
    await Promise.all([
      trySend(data.clientEmail, appointmentConfirmedClientTemplate(data.info), "confirmação cliente"),
      trySend(data.professionalEmail, appointmentConfirmedProfessionalTemplate(data.info), "confirmação profissional"),
    ]);
  } catch (error) {
    console.warn("Falha nos emails de confirmação:", error instanceof Error ? error.message : error);
  }
};

/** Lembrete de ~20 min antes — usado pelo reminderJob. */
export const sendAppointmentReminderEmails = async (appointmentId: number) => {
  if (!isSmtpConfigured()) return;
  try {
    const data = await loadAppointmentEmailData(appointmentId);
    if (!data) return;
    await Promise.all([
      trySend(data.clientEmail, appointmentReminderClientTemplate(data.info), "lembrete cliente"),
      trySend(data.professionalEmail, appointmentReminderProfessionalTemplate(data.info), "lembrete profissional"),
    ]);
  } catch (error) {
    console.warn("Falha nos emails de lembrete:", error instanceof Error ? error.message : error);
  }
};
