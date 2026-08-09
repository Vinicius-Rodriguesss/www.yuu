// db/schema/clientAddresses.ts
//
// Lista de endereços da conta GLOBAL do cliente final. Substitui o endereço
// único que ficava embutido em client_accounts — agora o cliente pode ter
// vários (casa, trabalho, etc.), com um marcado como principal (isPrimary),
// usado por padrão no atendimento a domicílio em qualquer profissional.
import { pgTable, integer, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { clientAccountsTable } from "./clientAccounts.js";

export const clientAddressesTable = pgTable("client_addresses", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  clientAccountId: integer("client_account_id")
    .notNull()
    .references(() => clientAccountsTable.id, { onDelete: "cascade" }),
  label: varchar({ length: 50 }), // "Casa", "Trabalho", etc. (opcional)
  cep: varchar({ length: 10 }).notNull(),
  street: varchar({ length: 255 }).notNull(),
  number: varchar({ length: 20 }).notNull(),
  complement: varchar({ length: 100 }),
  neighborhood: varchar({ length: 100 }).notNull(),
  city: varchar({ length: 100 }).notNull(),
  state: varchar({ length: 2 }).notNull(),
  isPrimary: boolean("is_primary").default(false).notNull(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
});
