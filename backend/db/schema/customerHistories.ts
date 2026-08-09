// db/schema/customerHistories.ts
import { pgTable, integer, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { customersTable } from "./customers.js";
import { usersTable } from "./users.js";

export const customerHistoriesTable = pgTable("customer_histories", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customersTable.id, { onDelete: "cascade" }),
  type: varchar({ length: 50 }).notNull(), // note, allergy, preference, medical
  content: text().notNull(),
  createdBy: integer("created_by")
    .notNull()
    .references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
});
