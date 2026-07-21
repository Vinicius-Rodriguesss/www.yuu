// db/schema/users.ts
import { pgTable, integer, varchar, boolean, timestamp } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  document: varchar({ length: 20 }).notNull().unique(),
  password: varchar({ length: 255 }).notNull(),
  phone: varchar({ length: 20 }),
  accountType: varchar({ length: 50 }).notNull(),
  homeService: boolean().notNull(),
  businessType: varchar({ length: 100 }).notNull(),
  aiStyle: varchar("ai_style", { length: 20 }).notNull(),
  customAiStyle: varchar("custom_ai_style", { length: 500 }),
  privacyAccepted: boolean().notNull(),
  scheduleInterval: integer("schedule_interval").default(15).notNull(), // minutos entre slots da agenda
  appointmentBuffer: integer("appointment_buffer").default(0).notNull(), // delay (descanso) entre atendimentos, em minutos
  publicSlug: varchar("public_slug", { length: 100 }).unique(), // link público de divulgação
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
});