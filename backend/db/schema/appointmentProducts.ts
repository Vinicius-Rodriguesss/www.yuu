// db/schema/appointmentProducts.ts
import { pgTable, integer, varchar, numeric, timestamp } from "drizzle-orm/pg-core";
import { appointmentsTable } from "./appointments.js";
import { productsTable } from "./products.js";

export const appointmentProductsTable = pgTable("appointment_products", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  appointmentId: integer("appointment_id")
    .notNull()
    .references(() => appointmentsTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => productsTable.id, { onDelete: "set null" }),
  name: varchar({ length: 255 }).notNull(), // snapshot do nome do produto no momento da venda
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(), // snapshot do preço unitário
  quantity: integer().notNull().default(1),
  createdAt: timestamp().defaultNow().notNull(),
});
