// db/schema/subscriptions.ts
import { pgTable, integer, varchar, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users.js";

// Assinatura da mensalidade de cada conta (dono do negócio), sincronizada
// via webhook do Stripe — nunca escrita "na mão" fora do webhook, exceto o
// registro inicial ao criar a Checkout Session.
export const subscriptionsTable = pgTable("subscriptions", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id")
    .notNull()
    .unique()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }).notNull().unique(),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }).unique(),
  // trialing | active | past_due | canceled | incomplete | incomplete_expired | unpaid
  status: varchar({ length: 30 }).default("incomplete").notNull(),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: timestamp("cancel_at_period_end"),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
});
