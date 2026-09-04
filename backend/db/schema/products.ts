// db/schema/products.ts
import { pgTable, integer, varchar, boolean, numeric, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users.js";

export const productsTable = pgTable("products", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  name: varchar({ length: 255 }).notNull(),
  price: numeric({ precision: 10, scale: 2 }).notNull(),
  active: boolean().notNull().default(true),
  trackStock: boolean("track_stock").notNull().default(false), // false = estoque ilimitado, ignora stockQuantity
  stockQuantity: integer("stock_quantity").notNull().default(0),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
});
