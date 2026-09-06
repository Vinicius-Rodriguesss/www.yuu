// db/schema/caixaSales.ts
import { pgTable, integer, varchar, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users.js";
import { customersTable } from "./customers.js";

// Uma venda do caixa. Agrupa um ou mais itens (caixa_entries) e guarda o que
// é da venda como um todo: cliente, forma de pagamento, desconto e horário.
// Total da venda = SUM(itens.amount) - discount.
export const caixaSalesTable = pgTable("caixa_sales", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  customerId: integer("customer_id").references(() => customersTable.id, { onDelete: "set null" }),
  discount: numeric({ precision: 10, scale: 2 }).notNull().default("0"),
  paymentMethod: varchar("payment_method", { length: 30 }).notNull().default("dinheiro"), // dinheiro, cartao, pix, outro
  soldAt: timestamp("sold_at").notNull(), // hora de parede em que a venda aconteceu
  notes: text(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
});
