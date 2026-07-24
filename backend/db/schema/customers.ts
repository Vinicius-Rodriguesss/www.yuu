// db/schema/customers.ts
import { pgTable, integer, varchar, text, timestamp, date } from "drizzle-orm/pg-core";
import { usersTable } from "./users.js";
import { clientAccountsTable } from "./clientAccounts.js";

export const customersTable = pgTable("customers", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  // Vínculo com a conta global do cliente final (agendamento público)
  clientAccountId: integer("client_account_id").references(() => clientAccountsTable.id, {
    onDelete: "set null",
  }),
  name: varchar({ length: 255 }).notNull(),
  document: varchar({ length: 20 }),
  phone: varchar({ length: 20 }),
  email: varchar({ length: 255 }),
  birthDate: date("birth_date"),
  notes: text(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
});
