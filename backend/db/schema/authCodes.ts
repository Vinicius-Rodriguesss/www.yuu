// db/schema/authCodes.ts
// Códigos de verificação por email: login (2FA), recuperação e troca de senha.
import { pgTable, integer, varchar, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users.js";

export const authCodesTable = pgTable("auth_codes", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  type: varchar({ length: 20 }).notNull(), // login | password_reset | password_change
  codeHash: varchar("code_hash", { length: 64 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  consumedAt: timestamp("consumed_at"),
  createdAt: timestamp().defaultNow().notNull(),
});
