// db/schema/clientAccounts.ts
//
// Conta GLOBAL do cliente final (quem agenda/conversa nas páginas públicas).
// Cadastro mínimo (LGPD): nome, CPF, celular e senha. Os endereços do
// cliente (para atendimento a domicílio) ficam em client_addresses —
// lista com CRUD completo, ver clientAddresses.ts.
import { pgTable, integer, varchar, timestamp } from "drizzle-orm/pg-core";

export const clientAccountsTable = pgTable("client_accounts", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  cpf: varchar({ length: 14 }).notNull().unique(),
  phone: varchar({ length: 20 }).notNull().unique(),
  email: varchar({ length: 255 }), // opcional — usado p/ confirmação e lembrete de agendamento
  password: varchar({ length: 255 }).notNull(),
  // Consentimento LGPD: momento em que o cliente aceitou o tratamento dos dados
  lgpdAcceptedAt: timestamp("lgpd_accepted_at").notNull(),

  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
});
