COMPOSE = docker compose -f .devcontainer/docker-compose.yml

# ── Lifecycle ─────────────────────────────────────────────────────────────────

.PHONY: up down restart rebuild logs

up:
	$(COMPOSE) up -d

down:
	$(COMPOSE) down

restart:
	$(COMPOSE) restart backend frontend

restart-backend:
	$(COMPOSE) restart backend

restart-frontend:
	$(COMPOSE) restart frontend

rebuild:
	$(COMPOSE) down
	$(COMPOSE) build --no-cache
	$(COMPOSE) up -d

# ── Logs ──────────────────────────────────────────────────────────────────────

.PHONY: logs logs-backend logs-frontend logs-db

logs:
	$(COMPOSE) logs -f

logs-backend:
	$(COMPOSE) logs -f backend

logs-frontend:
	$(COMPOSE) logs -f frontend

logs-db:
	$(COMPOSE) logs -f db

# ── Database / Alembic ────────────────────────────────────────────────────────

.PHONY: migrate migration psql

migrate:
	$(COMPOSE) exec backend alembic upgrade head

migration:
	$(COMPOSE) exec backend alembic revision --autogenerate -m "$(msg)"

psql:
	$(COMPOSE) exec db psql -U postgres -d superselector

# promote any registered user to admin: make admin email=you@example.com
admin:
	$(COMPOSE) exec backend python -c "\
import asyncio, sys; \
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession; \
from sqlalchemy.orm import sessionmaker; \
from sqlalchemy import select; \
from app.models import User; \
EMAIL='$(email)'; \
async def run(): \
    e = create_async_engine('postgresql+asyncpg://postgres:postgres@db:5432/superselector'); \
    S = sessionmaker(e, class_=AsyncSession, expire_on_commit=False); \
    async with S() as s: \
        r = await s.execute(select(User).where(User.email==EMAIL)); \
        u = r.scalar_one_or_none(); \
        print('Not found' if not u else (setattr(u,'is_admin',True) or 'ok')); \
        await s.commit(); \
    await e.dispose(); \
asyncio.run(run())"

# ── Status ────────────────────────────────────────────────────────────────────

.PHONY: ps

ps:
	$(COMPOSE) ps
