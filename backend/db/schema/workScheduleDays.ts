// db/schema/workScheduleDays.ts
import { pgTable, integer, boolean, timestamp, time } from "drizzle-orm/pg-core";
import { workSchedulesTable } from "./workSchedules.js";

export const workScheduleDaysTable = pgTable("work_schedule_days", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  workScheduleId: integer("work_schedule_id")
    .notNull()
    .references(() => workSchedulesTable.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Domingo, 1=Segunda, ..., 6=Sábado
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  appointmentInterval: integer("appointment_interval").notNull(), // minutos entre atendimentos
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
});
