// db/schema/users.ts
import { pgTable, integer, varchar, boolean, timestamp } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  document: varchar({ length: 20 }).notNull().unique(),
  password: varchar({ length: 255 }).notNull(),
  accountType: varchar({ length: 50 }).notNull(),
  homeService: boolean().notNull(),
  businessType: varchar({ length: 100 }).notNull(),
  aiStyle: varchar("ai_style", { length: 20 }).notNull(),
  customAiStyle: varchar("custom_ai_style", { length: 500 }),
  privacyAccepted: boolean().notNull(),
  createdAt: timestamp().defaultNow().notNull(),
});