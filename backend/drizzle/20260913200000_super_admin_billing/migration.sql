-- Papel do usuário (dono do negócio x operador da plataforma) e assinatura
-- da mensalidade via Stripe.

-- "IF NOT EXISTS" porque essa coluna já foi adicionada manualmente em
-- ambientes que testaram o super admin antes dessa migration existir.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" varchar(20) DEFAULT 'owner' NOT NULL;

CREATE TABLE IF NOT EXISTS "subscriptions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "subscriptions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL UNIQUE,
	"stripe_customer_id" varchar(255) NOT NULL UNIQUE,
	"stripe_subscription_id" varchar(255) UNIQUE,
	"status" varchar(30) DEFAULT 'incomplete' NOT NULL,
	"current_period_end" timestamp,
	"cancel_at_period_end" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE
);
