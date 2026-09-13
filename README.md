# www.yuu

SaaS de agendamentos (dono de negócio + cliente final) com dashboard, IA de
atendimento e painel de administrador da plataforma.

## Pré-requisitos

- Docker + Docker Compose
- `make` (no Windows, use Git Bash/WSL — o `make` não existe no PowerShell puro)

## Primeira vez rodando o projeto

1. Copie o `.env` (peça pra quem já tem um configurado, ou preencha as
   variáveis descritas nos comentários do próprio arquivo — SMTP, JWT_SECRET,
   Stripe etc).

2. Suba os containers:
   ```
   make up
   ```

3. Aplique as migrations pra criar as tabelas no banco:
   ```
   make db-migrate
   ```

4. Crie sua conta de super admin (acesso ao painel `/admin`):
   ```
   make create-admin
   ```
   Vai perguntar email, senha e nome passo a passo. Depois é só fazer login
   normal em `/` com esse email/senha.

5. Acesse:
   - Frontend: http://localhost:5173
   - API: http://localhost:3000

## Se você zerou o banco (`docker compose down -v` ou `make clean`)

O volume do Postgres também é apagado — o banco volta vazio. Repita os passos
3 e 4 acima (`make db-migrate` + `make create-admin`) pra reconstruir
o schema e recriar sua conta de admin.

## Depois de um `git pull` (dependências novas)

Se o `package.json` do backend ou do frontend mudou (nova dependência foi
adicionada), só `make up` **não** reinstala nada — o `node_modules` fica num
volume separado e não atualiza sozinho. Se a API cair com
`Cannot find package 'X'`, rode:
```
docker compose exec api npm install
docker compose restart api
```
(troque `api` por `frontend` se o erro for do lado do frontend).

## Comandos úteis (`make help` lista todos)

| Comando | O que faz |
|---|---|
| `make up` / `make down` | Sobe/derruba os containers |
| `make dev` | Sobe com logs no terminal (foreground) |
| `make logs` | Acompanha os logs de todos os serviços |
| `make sh-api` / `make sh-db` | Abre um shell no container da API / psql no banco |
| `make db-generate` | Gera migration a partir de mudanças no schema |
| `make db-push` | Aplica o schema atual direto no banco (sem gerar migration) |
| `make db-apply-migration FILE=...` | Aplica um `migration.sql` escrito à mão |
| `make create-admin` | Cria (ou promove) uma conta de super_admin — pergunta email/senha/nome |
| `make promote-admin EMAIL=...` | Promove uma conta já existente a super_admin |
| `make demote-admin EMAIL=...` | Reverte uma conta de super_admin pra owner normal |
| `make clean` | Derruba containers **e apaga os dados do banco** |

## Estrutura

- `src/` — frontend (React + Vite), dono de negócio e páginas públicas
- `mobile/` — app mobile do cliente final (Expo/React Native)
- `backend/` — API (Express + Drizzle ORM + Postgres). Documentação das
  rotas em [`backend/README.md`](backend/README.md).
- `backend/db/schema/` — fonte da verdade do schema do banco
- `backend/drizzle/` — migrations (algumas geradas, outras escritas à mão —
  veja `make db-apply-migration`)

## Autenticação e permissões

- Login (dono do negócio) é feito por **email + senha**, com 2FA por código
  enviado por email.
- `users.role` distingue `owner` (dono de negócio, padrão) de `super_admin`
  (operador da plataforma, acessa `/admin`). Promoção é sempre manual —
  não existe fluxo de auto-promoção na aplicação (ver `make create-admin`
  acima).

## Pagamentos (mensalidade)

Integração com Stripe (assinatura recorrente) em `backend/Services/Stripe/`.
Sem as chaves `STRIPE_SECRET_KEY` / `STRIPE_PRICE_ID` / `STRIPE_WEBHOOK_SECRET`
no `.env`, os botões de assinatura respondem "Pagamentos ainda não
configurados" — o resto do sistema funciona normalmente sem elas.
