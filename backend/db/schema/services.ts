// db/schema/services.ts
import { pgTable, integer, varchar, text, boolean, numeric, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users.js";

export const servicesTable = pgTable("services", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  title: varchar({ length: 255 }).notNull(),
  description: text(),
  duration: integer().notNull(),
  price: numeric({ precision: 10, scale: 2 }).notNull(),
  category: varchar({ length: 100 }).notNull(),
  active: boolean().notNull().default(true),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
});