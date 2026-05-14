# Super Selector

Fantasy Badminton League app. Players pick a team of 11 badminton players before a contest locks, earn points based on real match results, and compete on a leaderboard.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Query, React Router v6 |
| Backend | FastAPI, SQLAlchemy (async), Alembic, Pydantic v2 |
| Database | PostgreSQL (asyncpg driver) |
| Auth | JWT (email + password) |

---

## Local Development (devcontainer)

### Prerequisites
- Docker Desktop
- VS Code with the **Dev Containers** extension

### Setup

1. Clone the repo:
   ```bash
   git clone https://github.com/ankesh-mishra/super-selector.git
   cd super-selector
   ```

2. Copy the example env file:
   ```bash
   cp .env.example .env
   ```
   The defaults work as-is for local dev — no changes needed.

3. Open in VS Code → **Reopen in Container** when prompted.

4. Run migrations:
   ```bash
   make migrate
   ```

5. The app is now running:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API docs: http://localhost:8000/docs

### Makefile commands

```bash
make up               # start all services
make down             # stop all services
make restart          # restart backend + frontend
make restart-backend  # restart backend only
make logs             # tail all logs
make logs-backend     # tail backend logs
make migrate          # run pending Alembic migrations
make migration msg="describe change"  # create a new migration
make psql             # open a psql shell
make admin email=you@example.com      # promote a user to admin
```

---

## Deployment (Railway)

### Architecture
Three Railway services in one project:
- **Postgres** — Railway managed database plugin
- **Backend** — FastAPI, built from `backend/Dockerfile.prod`
- **Frontend** — React static site, built from `frontend/`

### Step 1 — Create Railway project

1. Sign up / log in at [railway.app](https://railway.app)
2. **New Project** → **Deploy from GitHub repo** → select `super-selector`

### Step 2 — Add Postgres

In your Railway project → **New** → **Database** → **Add PostgreSQL**

Railway automatically injects `DATABASE_URL` into services in the same project.

### Step 3 — Backend service

1. In the project → **New** → **GitHub Repo** → select `super-selector`
2. Set **Root Directory** to `backend`
3. Railway will detect `railway.toml` and use `Dockerfile.prod` automatically
4. Set the following **Variables**:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (reference your Postgres plugin) |
| `JWT_SECRET_KEY` | Run `openssl rand -hex 32` and paste the output |
| `ENVIRONMENT` | `production` |
| `CORS_ORIGINS` | `https://your-frontend.up.railway.app` *(fill in after frontend deploys)* |
| `JWT_ALGORITHM` | `HS256` |
| `JWT_EXPIRE_MINUTES` | `10080` |

> Migrations run automatically on every deploy via the start command.

### Step 4 — Frontend service

1. In the project → **New** → **GitHub Repo** → select `super-selector` again
2. Set **Root Directory** to `frontend`
3. Railway will detect `railway.toml` and run `npm run build`
4. Set the following **Variables**:

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://your-backend.up.railway.app` *(copy from backend service URL)* |

### Step 5 — Wire up CORS

1. Copy the frontend service URL (e.g. `https://super-selector-frontend.up.railway.app`)
2. Go to the **backend** service → Variables → update `CORS_ORIGINS` to that URL
3. Redeploy the backend

### Step 6 — Create first admin user

After deploy, register an account via the UI, then promote it to admin:

```bash
# From your local machine with railway CLI installed:
railway run --service backend python -c "
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.models import User
import os

EMAIL = 'your@email.com'
async def run():
    e = create_async_engine(os.environ['DATABASE_URL'])
    S = sessionmaker(e, class_=AsyncSession, expire_on_commit=False)
    async with S() as s:
        r = await s.execute(select(User).where(User.email == EMAIL))
        u = r.scalar_one_or_none()
        if u:
            u.is_admin = True
            await s.commit()
            print('Done')
        else:
            print('User not found')
    await e.dispose()
asyncio.run(run())
"
```

---

## Environment Variables Reference

### Backend

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string (`postgresql://...` or `postgresql+asyncpg://...`) |
| `JWT_SECRET_KEY` | ✅ | Long random string for signing JWTs. Generate: `openssl rand -hex 32` |
| `JWT_ALGORITHM` | ✅ | `HS256` |
| `JWT_EXPIRE_MINUTES` | ✅ | Token lifetime in minutes. Default `10080` (7 days) |
| `ENVIRONMENT` | ✅ | `development` or `production` |
| `CORS_ORIGINS` | ✅ | Comma-separated list of allowed frontend origins |

### Frontend

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | ✅ (production) | Full URL of the backend service. Leave blank in dev (Vite proxy handles it) |

---

## Project Structure

```
select/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app + middleware
│   │   ├── models.py        # SQLAlchemy ORM models
│   │   ├── schemas.py       # Pydantic v2 schemas
│   │   ├── config.py        # Settings (pydantic-settings)
│   │   ├── database.py      # Async engine + session
│   │   ├── dependencies.py  # Auth dependencies
│   │   ├── routers/         # Route handlers
│   │   └── services/        # Scoring engine
│   ├── alembic/             # Database migrations
│   ├── Dockerfile.prod      # Production Docker image
│   ├── railway.toml         # Railway deployment config
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/             # Axios client + endpoints
│   │   ├── components/      # Shared UI components
│   │   ├── context/         # Auth context
│   │   └── pages/           # Route pages
│   ├── railway.toml         # Railway deployment config
│   └── vercel.json          # SPA rewrite rules
├── .devcontainer/           # VS Code devcontainer config
├── .env.example             # Environment variable reference
├── Makefile                 # Dev shortcuts
└── railway.toml             # Root Railway config
```
