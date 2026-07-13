// db/schema/workSchedules.ts
import { pgTable, integer, varchar, boolean, timestamp, time } from "drizzle-orm/pg-core";
import { usersTable } from "./users.js";

export const workSchedulesTable = pgTable("work_schedules", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  daysOfWeek: varchar("days_of_week", { length: 50 }).notNull(), // "1,2,3,4,5"
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
});