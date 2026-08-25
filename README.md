# PokéDex Manager

Full-stack web application for managing a personal Pokémon collection. Built as a technical exam project demonstrating authentication, external API integration, data persistence, responsive UI, clean architecture, and deployability.

## Features

- **Authentication** — Register, login, JWT access tokens + opaque refresh rotation, protected routes
- **PokéAPI integration** — Browse, search, and view Pokémon details via backend proxy with TTL cache
- **Personal collection** — Catch Pokémon (server rolls shiny at 30%), status (caught / wishlist / favorite), nicknames, and notes
- **Evolve** — Evolve owned entries along PokéAPI chains (branch picker when needed); shiny form is preserved
- **Trades** — 1-for-1 trades between trainers; pending offers lock entries; accept swaps ownership
- **Dashboard** — Collection stats, trade shortcuts, on-demand AI insights
- **AI insights (bonus)** — Optional OpenAI analysis with Gemini fallback (env-gated; button on dashboard)
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

Design patterns used:
- **Layered architecture** — routes → controllers → services → repositories
- **Repository pattern** — Prisma data access isolated per domain
- **Adapter pattern** — `PokeApiClient` normalizes external API responses
- **Dependency injection** — `createContainer()` wires services in one place
- **DTO validation** — shared Zod schemas in `@pokedex/shared`

See [docs/architecture.md](./docs/architecture.md) for details.
See [docs/gaps.md](./docs/gaps.md) for known behavioral gaps and quirks.

## Prerequisites

- Node.js 20+
- npm 10+
- Docker & Docker Compose (recommended for local setup)
- PostgreSQL 16 (if running without Docker)

## Quick Start (Docker)

From the repo root:

```bash
cp .env.example .env
docker compose up --build
```

- **Web:** http://localhost:5177
- **API:** http://localhost:4000
- **Health:** http://localhost:4000/health

`VITE_API_URL` is baked into the web image at **build** time (Compose passes it as a build arg). Changing it later requires rebuilding the web service.

## Quick Start (Manual)

### 1. Install dependencies

```bash
npm install
```

### 2. Start PostgreSQL

```bash
docker compose up db -d
```

Default Compose maps Postgres to host port **5432**. If that port is taken, change the mapping in `docker-compose.yml` and set `DATABASE_URL` accordingly.

### 3. Configure environment

```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env
```

The API loads `apps/api/.env` then the repo-root `.env` **with override**. Prefer putting secrets in one place, or ensure root values are not empty placeholders that wipe API-local keys.

### 4. Run migrations

```bash
npm run db:generate -w @pokedex/api
npm run db:migrate -w @pokedex/api
```

### 5. Start dev servers

```bash
npm run dev
```

Or in separate terminals:

```bash
npm run dev:api   # http://localhost:4000
npm run dev:web   # http://localhost:5177
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Yes | Min 16 chars; signs access JWTs |
| `JWT_REFRESH_SECRET` | Yes | Min 16 chars; required by env validation. Refresh tokens are opaque random bytes stored as SHA-256 hashes — this value is **not** used to sign JWTs today |
| `JWT_ACCESS_EXPIRES_IN` | No | Access TTL (default `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | No | Refresh TTL as `Nd` days (default `7d`) |
| `CORS_ORIGIN` | No | Frontend origin (default: `http://localhost:5177`) |
| `VITE_API_URL` | No | API URL for the SPA (**build-time** for Vite / Docker / Render) |
| `OPENAI_API_KEY` | No | Enables AI collection insights (bonus) |
| `GEMINI_API_KEY` | No | Gemini fallback if OpenAI fails (or primary if OpenAI is unset) |
| `POKEAPI_CACHE_TTL_MS` | No | Cache TTL in ms (default: 600000) |

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
| POST | `/api/ai/insights` | Yes | Generate collection insights |

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
# Run all tests
npm test

# API only (smoke tests hit live PokéAPI; AI unit tests are mocked)
npm run test -w @pokedex/api
```

Coverage is thin for trade races, shiny uniqueness, and evolve branches — see [docs/gaps.md](./docs/gaps.md).

## Deployment (Render)

1. Push this repo to GitHub
2. Create a **Blueprint** on [Render](https://render.com) using `render.yaml` at the repo root
3. Set `CORS_ORIGIN` to your static site URL (manual)
4. Set `VITE_API_URL` to your API service URL (manual; must rebuild the static site after changes)
5. Optionally set `OPENAI_API_KEY` and/or `GEMINI_API_KEY` for AI insights

Do **not** set `plan` on the static web service — Render rejects `plan: free` for static sites.

Alternative: deploy API + DB on Railway, frontend on Vercel/Netlify with the same env vars (remember Vite build-time `VITE_API_URL`).

## Assumed Exam Requirements

The exam PDF provided a summary without detailed day-by-day specs. This implementation covers:

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
