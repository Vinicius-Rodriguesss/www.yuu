-- Caixa: separa "venda" (caixa_sales) de "item da venda" (caixa_entries).
-- caixa_sales guarda cliente, forma de pagamento, desconto, horário e notas.
-- caixa_entries passa a ser só o item (tipo, serviço/produto, descrição, valor)
-- e aponta pra uma venda via sale_id.
-- Migração de dados: cada caixa_entries existente vira uma venda de 1 item.

CREATE TABLE "caixa_sales" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "caixa_sales_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"customer_id" integer,
	"discount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"payment_method" varchar(30) DEFAULT 'dinheiro' NOT NULL,
	"sold_at" timestamp NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "caixa_sales" ADD CONSTRAINT "caixa_sales_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "caixa_sales" ADD CONSTRAINT "caixa_sales_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL;--> statement-breakpoint

-- backfill: uma venda por lançamento existente (coluna temporária pra correlacionar)
ALTER TABLE "caixa_sales" ADD COLUMN "legacy_entry_id" integer;--> statement-breakpoint
INSERT INTO "caixa_sales" ("user_id", "customer_id", "discount", "payment_method", "sold_at", "notes", "createdAt", "updatedAt", "legacy_entry_id")
SELECT "user_id", "customer_id", 0, "payment_method", "sold_at", "notes", "createdAt", "updatedAt", "id"
FROM "caixa_entries";--> statement-breakpoint

ALTER TABLE "caixa_entries" ADD COLUMN "sale_id" integer;--> statement-breakpoint
UPDATE "caixa_entries" e SET "sale_id" = s."id" FROM "caixa_sales" s WHERE s."legacy_entry_id" = e."id";--> statement-breakpoint
ALTER TABLE "caixa_sales" DROP COLUMN "legacy_entry_id";--> statement-breakpoint

ALTER TABLE "caixa_entries" ALTER COLUMN "sale_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "caixa_entries" ADD CONSTRAINT "caixa_entries_sale_id_caixa_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "caixa_sales"("id") ON DELETE CASCADE;--> statement-breakpoint

-- colunas que migraram pra caixa_sales
ALTER TABLE "caixa_entries" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "caixa_entries" DROP COLUMN "customer_id";--> statement-breakpoint
ALTER TABLE "caixa_entries" DROP COLUMN "payment_method";--> statement-breakpoint
ALTER TABLE "caixa_entries" DROP COLUMN "sold_at";--> statement-breakpoint
ALTER TABLE "caixa_entries" DROP COLUMN "notes";--> statement-breakpoint
ALTER TABLE "caixa_entries" DROP COLUMN "updatedAt";
