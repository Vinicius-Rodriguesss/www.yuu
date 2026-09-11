-- Antecipar atendimento quando o profissional termina mais cedo.

-- Término real do atendimento (preenchido ao marcar "completed").
-- A disponibilidade passa a liberar a agenda a partir daqui.
ALTER TABLE "appointments" ADD COLUMN "ended_at" timestamp;

-- Cliente pode optar por não receber ofertas de antecipação.
ALTER TABLE "customers" ADD COLUMN "advance_offers_opt_out" boolean DEFAULT false NOT NULL;

-- Ofertas de antecipação (fluxo com e-mail + link tokenizado, efeito cascata).
CREATE TABLE "advance_offers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "advance_offers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"appointment_id" integer NOT NULL,
	"origin_appointment_id" integer NOT NULL,
	"token" varchar(64) NOT NULL,
	"offered_start_at" timestamp NOT NULL,
	"previous_start_at" timestamp NOT NULL,
	"hold_minutes" integer NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"responded_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "advance_offers_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "advance_offers" ADD CONSTRAINT "advance_offers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "advance_offers" ADD CONSTRAINT "advance_offers_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "advance_offers" ADD CONSTRAINT "advance_offers_origin_appointment_id_appointments_id_fk" FOREIGN KEY ("origin_appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE;--> statement-breakpoint
CREATE INDEX "advance_offers_pending_idx" ON "advance_offers" ("status", "expires_at");
