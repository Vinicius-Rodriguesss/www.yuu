.DEFAULT_GOAL := help

COMPOSE := docker compose

.PHONY: help up dev down stop restart build logs ps sh-api sh-frontend sh-db \
        install lint db-generate db-migrate db-push db-push-local db-studio db-shell clean \
        db-apply-migration promote-admin demote-admin create-admin

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*## ' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

up: ## Start all services in the background
	$(COMPOSE) up -d

dev: ## Start all services attached (logs in foreground)
	$(COMPOSE) up

down: ## Stop and remove containers
	$(COMPOSE) down

stop: ## Stop containers without removing them
	$(COMPOSE) stop

restart: down up ## Restart all services

build: ## Rebuild images
	$(COMPOSE) build

logs: ## Tail logs from all services
	$(COMPOSE) logs -f

ps: ## List running services
	$(COMPOSE) ps

sh-api: ## Open a shell in the api container
	$(COMPOSE) exec api sh

sh-frontend: ## Open a shell in the frontend container
	$(COMPOSE) exec frontend sh

sh-db: ## Open a psql shell in the postgres container
	$(COMPOSE) exec postgres psql -U $${POSTGRES_USER:-yuu} -d $${POSTGRES_DB:-yuu_db}

install: ## Install dependencies (frontend + backend)
	npm install
	npm install --prefix backend

lint: ## Run eslint on the frontend
	npm run lint

db-generate: ## Generate Drizzle migration files from schema changes
	$(COMPOSE) exec api npm run db:generate

db-migrate: ## Apply pending Drizzle migrations
	$(COMPOSE) exec api npm run db:migrate

db-push: ## Push schema changes directly to the database (no migration files)
	$(COMPOSE) exec api npm run db:push

db-push-local: ## Push schema changes directly to the database, running locally (no docker)
	cd backend && npx drizzle-kit push

db-studio: ## Open Drizzle Studio
	$(COMPOSE) exec api npm run db:studio

db-apply-migration: ## Apply a hand-written migration.sql (usage: make db-apply-migration FILE=backend/drizzle/xxx/migration.sql)
	@test -n "$(FILE)" || (echo "Usage: make db-apply-migration FILE=backend/drizzle/xxx/migration.sql"; exit 1)
	$(COMPOSE) exec -T postgres psql -U $${POSTGRES_USER:-yuu} -d $${POSTGRES_DB:-yuu_db} < $(FILE)

promote-admin: ## Grant super_admin role to a user (usage: make promote-admin EMAIL=someone@example.com)
	@test -n "$(EMAIL)" || (echo "Usage: make promote-admin EMAIL=someone@example.com"; exit 1)
	$(COMPOSE) exec postgres psql -U $${POSTGRES_USER:-yuu} -d $${POSTGRES_DB:-yuu_db} \
		-c "UPDATE users SET role='super_admin' WHERE email='$(EMAIL)' RETURNING id, name, email, role;"

demote-admin: ## Revert a user back to the regular owner role (usage: make demote-admin EMAIL=someone@example.com)
	@test -n "$(EMAIL)" || (echo "Usage: make demote-admin EMAIL=someone@example.com"; exit 1)
	$(COMPOSE) exec postgres psql -U $${POSTGRES_USER:-yuu} -d $${POSTGRES_DB:-yuu_db} \
		-c "UPDATE users SET role='owner' WHERE email='$(EMAIL)' RETURNING id, name, email, role;"

create-admin: ## Create (or promote) a super_admin account — asks for email/password/name step by step
	$(COMPOSE) exec api npm run create-admin

clean: ## Stop containers and remove volumes (drops the database data!)
	$(COMPOSE) down -v
