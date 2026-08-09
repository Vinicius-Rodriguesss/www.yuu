// db/schema/workSchedules.ts
import { pgTable, integer, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users.js";

export const workSchedulesTable = pgTable("work_schedules", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  name: varchar({ length: 100 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
});