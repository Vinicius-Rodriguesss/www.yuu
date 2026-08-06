// db/schema/caixaEntries.ts
import { pgTable, integer, varchar, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users.js";
import { servicesTable } from "./services.js";
import { productsTable } from "./products.js";
import { customersTable } from "./customers.js";

export const caixaEntriesTable = pgTable("caixa_entries", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  type: varchar({ length: 20 }).notNull(), // service, product, other
  serviceId: integer("service_id").references(() => servicesTable.id, { onDelete: "set null" }),
  productId: integer("product_id").references(() => productsTable.id, { onDelete: "set null" }),
  customerId: integer("customer_id").references(() => customersTable.id, { onDelete: "set null" }),
  description: varchar({ length: 255 }).notNull(), // snapshot do nome do serviço/produto (ou texto livre em "outro")
  amount: numeric({ precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 30 }).notNull().default("dinheiro"), // dinheiro, cartao, pix, outro
  soldAt: timestamp("sold_at").notNull(), // hora de parede em que a venda aconteceu/terminou
  notes: text(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
});
