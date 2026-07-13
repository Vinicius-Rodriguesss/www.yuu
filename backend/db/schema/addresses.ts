// db/schema/addresses.ts
import { pgTable, integer, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./users.js";

export const addressesTable = pgTable("addresses", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  cep: varchar({ length: 10 }).notNull(),
  street: varchar({ length: 255 }).notNull(),
  number: varchar({ length: 20 }).notNull(),
  complement: varchar({ length: 100 }),
  neighborhood: varchar({ length: 100 }).notNull(),
  city: varchar({ length: 100 }).notNull(),
  state: varchar({ length: 2 }).notNull(),
});