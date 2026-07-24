// db/schema/clientAccounts.ts
//
// Conta GLOBAL do cliente final (quem agenda/conversa nas páginas públicas).
// Cadastro mínimo (LGPD): nome, CPF, celular e senha. O endereço é opcional e
// só é preenchido quando o cliente pede atendimento a domicílio — fica salvo
// aqui para ser reaproveitado em qualquer profissional.
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

  // Endereço salvo do cliente (para atendimento a domicílio)
  cep: varchar({ length: 10 }),
  street: varchar({ length: 255 }),
  number: varchar({ length: 20 }),
  complement: varchar({ length: 100 }),
  neighborhood: varchar({ length: 100 }),
  city: varchar({ length: 100 }),
  state: varchar({ length: 2 }),

  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
});
