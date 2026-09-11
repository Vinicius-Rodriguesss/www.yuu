// db/schema/users.ts
import { pgTable, integer, varchar, boolean, timestamp, numeric, time } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  document: varchar({ length: 20 }).notNull().unique(),
  password: varchar({ length: 255 }).notNull(),
  // Papel do usuário na plataforma. "owner" = dono de negócio (padrão, todo
  // signup). "super_admin" = operador da plataforma (equipe YuU): não tem
  // agenda própria, enxerga e administra todos os negócios. O PRIMEIRO super
  // admin é criado pelo assistente de setup inicial (GET/POST /setup/*),
  // liberado só enquanto nenhum super admin existir; qualquer promoção depois
  // dessa é manual (UPDATE no banco).
  role: varchar({ length: 20 }).notNull().default("owner"), // "owner" | "super_admin"
  email: varchar({ length: 255 }).unique(), // usado para login (2FA), boas-vindas, recuperação e troca de senha
  phone: varchar({ length: 20 }),
  accountType: varchar({ length: 50 }).notNull(),
  homeService: boolean().notNull(),
  businessType: varchar({ length: 100 }).notNull(),
  aiStyle: varchar("ai_style", { length: 20 }).notNull(),
  customAiStyle: varchar("custom_ai_style", { length: 500 }),
  privacyAccepted: boolean().notNull(),
  scheduleInterval: integer("schedule_interval").default(15).notNull(), // minutos entre slots da agenda
  appointmentBuffer: integer("appointment_buffer").default(0).notNull(), // delay (descanso) entre atendimentos, em minutos
  publicSlug: varchar("public_slug", { length: 100 }).unique(), // link público de divulgação

  // Pausa fixa recorrente (ex: almoço 12:00-13:00), aplicada todo dia de
  // trabalho. Null nos dois = sem pausa configurada.
  breakStart: time("break_start"),
  breakEnd: time("break_end"),

  // Deslocamento no atendimento a domicílio — usado pra cobrar o custo de
  // combustível do cliente e limitar até onde o profissional atende.
  homeServiceTransport: varchar("home_service_transport", { length: 20 }).default("car").notNull(), // car | motorcycle | none (none = a pé/bike/transporte público, sem custo de combustível)
  homeServiceFuelConsumption: numeric("home_service_fuel_consumption", { precision: 5, scale: 2 }), // km por litro do veículo
  homeServiceFuelPrice: numeric("home_service_fuel_price", { precision: 6, scale: 2 }), // R$ por litro — o profissional atualiza manualmente (preço muda com frequência)
  homeServiceMaxDistanceKm: integer("home_service_max_distance_km"), // distância máxima que atende a domicílio; null = sem limite

  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),

  // Marca a última vez que o login foi confirmado com o código de 2FA.
  // Enquanto essa marca estiver dentro da validade do JWT de sessão (1 dia),
  // o login não pede o código de novo — só volta a pedir depois que o
  // token da última vez expiraria.
  lastVerifiedAt: timestamp("last_verified_at"),
});