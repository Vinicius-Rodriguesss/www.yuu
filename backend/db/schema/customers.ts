// db/schema/customers.ts
import { pgTable, integer, varchar, text, timestamp, date, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users.js";
import { clientAccountsTable } from "./clientAccounts.js";

export const customersTable = pgTable(
  "customers",
  {
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
    // Cliente optou por não receber e-mails oferecendo antecipar o horário dele
    // quando o profissional termina um atendimento mais cedo.
    advanceOffersOptOut: boolean("advance_offers_opt_out").default(false).notNull(),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp().defaultNow().notNull(),
  },
  (table) => [
    // Únicos por profissional (userId) — dois profissionais podem ter
    // clientes distintos com o mesmo documento/telefone/email, mas o mesmo
    // profissional não pode cadastrar o mesmo cliente duas vezes.
    // NULL não conflita com NULL (padrão do Postgres), então campos vazios
    // continuam permitidos em múltiplos clientes.
    uniqueIndex("customers_user_document_unique").on(table.userId, table.document),
    uniqueIndex("customers_user_phone_unique").on(table.userId, table.phone),
    uniqueIndex("customers_user_email_unique").on(table.userId, table.email),
  ]
);
