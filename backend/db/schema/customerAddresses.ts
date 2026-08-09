// db/schema/customerAddresses.ts
import { pgTable, integer, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { customersTable } from "./customers.js";

export const customerAddressesTable = pgTable("customer_addresses", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customersTable.id, { onDelete: "cascade" }),
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
