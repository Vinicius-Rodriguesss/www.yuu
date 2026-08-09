// db/schema/blockedSlots.ts
import { pgTable, integer, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users.js";

export const blockedSlotsTable = pgTable("blocked_slots", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  type: varchar({ length: 50 }).notNull(), // break, block, vacation, lunch, etc.
  title: varchar({ length: 255 }).notNull(), // "Almoço", "Consulta médica", "Folga"
  startAt: timestamp("start_at").notNull(), // data e hora de início do bloqueio
  endAt: timestamp("end_at").notNull(),     // data e hora de término do bloqueio
  isRecurring: boolean("is_recurring").default(false).notNull(),
  recurrenceRule: varchar("recurrence_rule", { length: 500 }), // ex: "RRULE:FREQ=DAILY;BYHOUR=12"
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
});
