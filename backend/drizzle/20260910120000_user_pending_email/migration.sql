-- Troca de email com confirmação por código: guarda o novo email enquanto
-- ele não é confirmado. Null = sem troca em andamento. O `email` da conta só
-- muda depois que o usuário confirma o código enviado para este endereço.

ALTER TABLE "users" ADD COLUMN "pending_email" varchar(255);
