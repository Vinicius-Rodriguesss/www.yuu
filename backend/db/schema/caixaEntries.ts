// db/schema/caixaEntries.ts
import { pgTable, integer, varchar, numeric, timestamp } from "drizzle-orm/pg-core";
import { caixaSalesTable } from "./caixaSales.js";
import { servicesTable } from "./services.js";
import { productsTable } from "./products.js";

// Um item de uma venda do caixa (caixa_sales). Pode ser um serviço prestado,
// um produto vendido ou algo livre ("outro"). O que é da venda como um todo
// (cliente, pagamento, desconto, horário) mora em caixa_sales.
export const caixaEntriesTable = pgTable("caixa_entries", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  saleId: integer("sale_id")
    .notNull()
    .references(() => caixaSalesTable.id, { onDelete: "cascade" }),
  type: varchar({ length: 20 }).notNull(), // service, product, other
  serviceId: integer("service_id").references(() => servicesTable.id, { onDelete: "set null" }),
  productId: integer("product_id").references(() => productsTable.id, { onDelete: "set null" }),
  description: varchar({ length: 255 }).notNull(), // snapshot do nome do serviço/produto (ou texto livre em "outro")
  amount: numeric({ precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp().defaultNow().notNull(),
});
