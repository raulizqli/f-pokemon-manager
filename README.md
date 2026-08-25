# PokéDex Manager

Full-stack web application for managing a personal Pokémon collection. Built as a technical exam project demonstrating authentication, external API integration, data persistence, responsive UI, clean architecture, and deployability.

## Features

- **Authentication** — Register / login / logout; JWT access + opaque hashed refresh rotation; protected `/app/*` routes
- **Auth redirects** — Log out and session expiry land on `/login` with a notice; signed-in users are redirected away from `/login` and `/register`
- **PokéAPI integration** — Browse, search, and view Pokémon details via backend proxy with TTL cache
- **Personal collection** — Catch (server rolls shiny at 30%), edit nickname / notes / status, remove
- **Evolve** — Evolve owned entries along PokéAPI chains (branch picker when needed); shiny form is preserved
- **Trades** — 1-for-1 trades between trainers; pending offers lock entries; accept swaps ownership
- **Dashboard** — Collection stats, trade shortcuts, on-demand AI insights (button + rate-limited)
- **AI insights (bonus)** — Optional OpenAI analysis with Gemini fallback (env-gated)
- **Responsive UI** — Mobile-first Tailwind CSS design

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS v4, TanStack Query, React Router |
| Backend | Node.js, Express, TypeScript, Zod |
| Database | PostgreSQL, Prisma ORM |
| Auth | JWT access + bcrypt; refresh tokens hashed (SHA-256) with rotation |
| External API | [PokéAPI v2](https://pokeapi.co/) |
| Deploy | Docker Compose, Render blueprint |

## Architecture

```
apps/web (React)  ──REST──►  apps/api (Express)  ──►  PostgreSQL
                                    │
                                    └──► PokéAPI (cached)
```

Design patterns: layered routes → controllers → services → repositories; shared Zod DTOs in `@pokedex/shared`; DI via `createContainer()`.

- Details: [docs/architecture.md](./docs/architecture.md)
- Known quirks: [docs/gaps.md](./docs/gaps.md)
- HTTP examples: [docs/api.http](./docs/api.http)

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | 20+ |
| npm | 10+ |
| Docker + Compose | Optional but recommended for Postgres / full stack |

## Install (local development)

Use **one** of the two paths below. Prefer Docker if you want the fewest moving parts.

### Option A — Full stack with Docker

```bash
# 1. Clone and enter the repo root
cd f-pokemon-manager   # or your clone directory name

# 2. Env file (JWT secret + optional AI keys)
cp .env.example .env

# 3. Build and start db + api + web
docker compose up --build
```

| Service | URL |
|---|---|
| Web | http://localhost:5177 |
| API | http://localhost:4000 |
| Health | http://localhost:4000/health |

Notes:

- First boot runs migrations via the API start command in the image / compose flow as configured.
- `VITE_API_URL` is a **build arg**. Changing the API URL requires `docker compose up --build` again.
- Default Postgres host port is **5432**. If busy, edit `docker-compose.yml` ports and `DATABASE_URL`.

### Option B — Manual (API + web on the host, Postgres in Docker)

```bash
# 1. Install workspace deps (from repo root)
npm install

# 2. Start only Postgres
docker compose up db -d

# 3. Configure env
cp .env.example .env
cp apps/web/.env.example apps/web/.env

# 4. Point DATABASE_URL at local Postgres (default in .env.example is fine if port 5432 is free)
#    DATABASE_URL=postgresql://pokedex:pokedex@localhost:5432/pokedex

# 5. Generate Prisma client + apply migrations
npm run db:generate -w @pokedex/api
npm run db:migrate -w @pokedex/api

# 6. Run API + web
npm run dev
```

| Service | URL |
|---|---|
| Web (Vite) | http://localhost:5177 |
| API | http://localhost:4000 |

Separate terminals if you prefer:

```bash
npm run dev:api
npm run dev:web
```

### First-run checklist

1. Open http://localhost:5177 → **Get started** (register) or **Log in**
2. Explore Pokémon → catch one (may roll shiny)
3. Open **My Collection** → **Edit** nickname / notes / status
4. Open a detail page → **Evolve** when available
5. With a second account → **Trades** → propose / accept
6. Dashboard → **Generate insights** only if AI keys are set

### Common install problems

| Symptom | Fix |
|---|---|
| `EADDRINUSE` on 5432 | Change Compose `db` port mapping and `DATABASE_URL` |
| API can’t reach DB | Wait for `docker compose` health; confirm `DATABASE_URL` |
| Web calls wrong API | Set `VITE_API_URL` in `apps/web/.env` (dev) or rebuild web with the build arg (Docker/Render) |
| Empty AI keys wipe real ones | Prefer a single env file; root `.env` **overrides** `apps/api/.env` |
| Auth “Too many attempts” | Rate limit: 20/min on login/register/refresh |

## Environment Variables

Copy from [`.env.example`](./.env.example). For local Vite, also copy [`apps/web/.env.example`](./apps/web/.env.example).

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Yes | Min 16 chars; signs access JWTs |
| `JWT_ACCESS_EXPIRES_IN` | No | Access TTL (default `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | No | Refresh TTL as `Nd` days (default `7d`). Refresh tokens are opaque random bytes stored as SHA-256 hashes |
| `CORS_ORIGIN` | No | Frontend origin (default: `http://localhost:5177`) |
| `VITE_API_URL` | No | API URL for the SPA (**build-time** for Vite production / Docker / Render) |
| `OPENAI_API_KEY` | No | Enables AI collection insights (bonus) |
| `GEMINI_API_KEY` | No | Gemini fallback if OpenAI fails (or primary if OpenAI is unset) |
| `POKEAPI_CACHE_TTL_MS` | No | Cache TTL in ms (default: 600000) |

## App routes (UI)

| Path | Access | What it does |
|---|---|---|
| `/` | Public | Landing |
| `/login` | Public | Sign in (shows logout / “please sign in” notices) |
| `/register` | Public | Create account |
| `/app` | Auth | Dashboard + Generate insights |
| `/app/explore` | Auth | Catalog browse / search |
| `/app/pokemon/:id` | Auth | Detail, catch, evolve |
| `/app/collection` | Auth | Collection list + inline edit / remove |
| `/app/trades` | Auth | Incoming / outgoing trades |
| `/app/trades/new/:userId` | Auth | Propose a 1-for-1 trade |

## API Reference

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Sign in |
| POST | `/api/auth/refresh` | No | Rotate refresh + issue access |
| POST | `/api/auth/logout` | No | Invalidate refresh token |
| GET | `/api/auth/me` | Yes | Current user profile |

### Pokémon

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/pokemon?limit&offset&search` | No | Paginated catalog |
| GET | `/api/pokemon/:idOrName` | No | Pokémon detail |
| GET | `/api/pokemon/:idOrName/evolutions` | No | Next evolution options |

### Collection

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/collection` | Yes | List user's collection |
| GET | `/api/collection/stats` | Yes | Collection statistics (includes shiny count) |
| POST | `/api/collection` | Yes | Catch / add (server rolls shiny) |
| POST | `/api/collection/:id/evolve` | Yes | Evolve entry (`targetPokemonId` when branched) |
| PATCH | `/api/collection/:id` | Yes | Update nickname / notes / status |
| DELETE | `/api/collection/:id` | Yes | Remove entry |

Ownership failures return **403**. Unique form conflicts return **409**. Entries in a pending trade cannot be updated, deleted, or evolved.

### Users & trades

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/users?search` | Yes | List other trainers |
| GET | `/api/users/:id/collection` | Yes | Public view of a trainer’s collection |
| GET | `/api/trades` | Yes | Trades involving the current user |
| POST | `/api/trades` | Yes | Propose a 1-for-1 trade |
| POST | `/api/trades/:id/accept` | Yes | Recipient accepts (ownership swap) |
| POST | `/api/trades/:id/reject` | Yes | Recipient rejects |
| POST | `/api/trades/:id/cancel` | Yes | Initiator cancels |

Wishlist entries cannot be traded. At most one **pending** trade per collection entry (enforced in DB).

### AI (Bonus)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/ai/status` | Yes | Check if AI is enabled |
| POST | `/api/ai/insights` | Yes | Generate collection insights (rate-limited) |

Example register request:

```json
POST /api/auth/register
{
  "email": "ash@pallet.com",
  "password": "password123",
  "displayName": "Ash"
}
```

See [docs/api.http](./docs/api.http) for more examples.

## Database Schema

- **User** — account credentials and profile
- **RefreshToken** — hashed refresh tokens with expiry
- **CollectionEntry** — owned Pokémon with denormalized name/sprite snapshot and `isShiny`
- **Trade** — 1-for-1 offers with Pokémon snapshots; status `pending` / `accepted` / `rejected` / `cancelled`

Unique constraint on collection: one entry per `(userId, pokemonId, isShiny)` — you may own both normal and shiny of the same species.

Partial unique indexes: at most one pending trade per `offeredEntryId` / `requestedEntryId`.

## Testing

```bash
npm test
npm run test -w @pokedex/api
```

Smoke + unit coverage for trade accept/propose conflicts, shiny uniqueness / evolve branches, and PokéAPI 404 mapping. See [docs/gaps.md](./docs/gaps.md).

## Deployment (Render)

1. Push this repo to GitHub
2. Create a **Blueprint** on [Render](https://render.com) using `render.yaml` at the repo root
3. Set `CORS_ORIGIN` to your static site URL (manual)
4. Set `VITE_API_URL` to your API service URL (manual; must rebuild the static site after changes)
5. Optionally set `OPENAI_API_KEY` and/or `GEMINI_API_KEY` for AI insights

Do **not** set `plan` on the static web service — Render rejects `plan: free` for static sites.

## Assumed Exam Requirements

1. Basic authentication (register/login/logout/JWT)
2. PokéAPI integration (list, search, detail, evolutions)
3. Data persistence (PostgreSQL collection CRUD + shiny + evolve)
4. Trades between users
5. Responsive UI (mobile-first, core + trades pages)
6. Documentation (this README + architecture + gaps + API examples)
7. Bonus: AI insights via OpenAI with Gemini fallback (optional, env-gated)

## Project Structure

```
.
├── apps/
│   ├── api/          # Express REST API
│   └── web/          # React SPA
├── packages/
│   └── shared/       # Zod schemas + shared types
├── docs/
├── docker-compose.yml
├── render.yaml
└── README.md
```

## License

MIT — exam submission project.
