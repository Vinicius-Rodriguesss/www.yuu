-- Adiciona o papel do usuário na plataforma.
-- "owner"       -> dono de negócio (padrão, todo signup existente e futuro)
-- "super_admin" -> operador da plataforma (equipe YuU), promovido manualmente
--
-- Para promover alguém depois de aplicar:
--   UPDATE "users" SET "role" = 'super_admin' WHERE "document" = '<cpf/cnpj>';

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" varchar(20) DEFAULT 'owner' NOT NULL;
