.DEFAULT_GOAL := help

# ─── Dev ──────────────────────────────────────────────────────────────────────

dev: ## Start development server (API + frontend)
	npm run dev

build: ## Build for production
	npm run build

test: ## Run tests
	npm run test

type-check: ## Run TypeScript type check
	npm run type-check

# ─── Database ─────────────────────────────────────────────────────────────────

db-generate: ## Generate migration from schema changes
	npm run db:generate

db-migrate: ## Apply pending migrations → dev (requires 1Password)
	npm run db:migrate

db-migrate-prod: ## Apply pending migrations → prod (requires 1Password)
	npm run db:migrate:prod

db-status: ## Check migration status → dev (requires 1Password)
	npm run db:status

db-status-prod: ## Check migration status → prod (requires 1Password)
	npm run db:status:prod

db-studio: ## Open Drizzle Studio (uses .env.local)
	npm run db:studio

# ─── Help ─────────────────────────────────────────────────────────────────────

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
