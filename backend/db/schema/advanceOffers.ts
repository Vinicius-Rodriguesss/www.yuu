// db/schema/advanceOffers.ts
// Ofertas de antecipação: quando o profissional termina um atendimento mais
// cedo, o próximo cliente da fila recebe um e-mail perguntando se quer adiantar
// o horário dele. Cada aceite gera a próxima oferta (efeito cascata). Uma
// oferta pendente por vez por cadeia.
import { pgTable, integer, varchar, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users.js";
import { appointmentsTable } from "./appointments.js";

export const advanceOffersTable = pgTable("advance_offers", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  // Agendamento que recebeu a oferta de novo horário
  appointmentId: integer("appointment_id")
    .notNull()
    .references(() => appointmentsTable.id, { onDelete: "cascade" }),
  // Atendimento finalizado cedo que iniciou a cadeia (para agrupar/analytics)
  originAppointmentId: integer("origin_appointment_id")
    .notNull()
    .references(() => appointmentsTable.id, { onDelete: "cascade" }),
  token: varchar({ length: 64 }).notNull().unique(), // vai nos links do e-mail
  offeredStartAt: timestamp("offered_start_at").notNull(), // novo horário proposto
  previousStartAt: timestamp("previous_start_at").notNull(), // horário atual (para desfazer / exibir)
  holdMinutes: integer("hold_minutes").notNull(), // quanto tempo a janela fica reservada a partir de offeredStartAt
  status: varchar({ length: 20 }).notNull().default("pending"), // pending | accepted | declined | expired | aborted
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  respondedAt: timestamp("responded_at"),
  expiresAt: timestamp("expires_at").notNull(), // sentAt + 10 min
  createdAt: timestamp().defaultNow().notNull(),
});
