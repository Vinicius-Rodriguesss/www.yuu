// db/schema/appointments.ts
import { pgTable, integer, varchar, text, timestamp, numeric, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users.js";
import { customersTable } from "./customers.js";
import { servicesTable } from "./services.js";
import { customerAddressesTable } from "./customerAddresses.js";

export const appointmentsTable = pgTable("appointments", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customersTable.id, { onDelete: "cascade" }),
  serviceId: integer("service_id")
    .notNull()
    .references(() => servicesTable.id, { onDelete: "restrict" }),
  scheduledAt: timestamp("scheduled_at").notNull(), // data e hora do agendamento
  duration: integer().notNull(), // snapshot do serviço
  price: numeric({ precision: 10, scale: 2 }).notNull(), // snapshot do serviço
  status: varchar({ length: 50 }).notNull().default("scheduled"), // scheduled, confirmed, in_progress, completed, cancelled, no_show
  notes: text(),
  meetingToken: varchar("meeting_token", { length: 64 }).unique(), // link único do atendimento (futuro: IA)
  isHomeService: boolean("is_home_service").default(false).notNull(),
  travelMinutes: integer("travel_minutes").default(0).notNull(), // deslocamento até o cliente; soma no tempo ocupado
  customerAddressId: integer("customer_address_id").references(() => customerAddressesTable.id, {
    onDelete: "set null",
  }),
  cancelledAt: timestamp("cancelled_at"),
  cancellationReason: varchar("cancellation_reason", { length: 255 }),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
});
