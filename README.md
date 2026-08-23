# PokéDex Manager

Full-stack web application for managing a personal Pokémon collection. Built as a technical exam project demonstrating authentication, external API integration, data persistence, responsive UI, clean architecture, and deployability.

## Features

- **Authentication** — Register, login, JWT access/refresh tokens, protected routes
- **PokéAPI integration** — Browse, search, and view Pokémon details via backend proxy with TTL cache
- **Personal collection** — Add, update, remove Pokémon with status (caught / wishlist / favorite), nicknames, and notes
- **Dashboard** — Collection stats and quick navigation
- **AI insights (bonus)** — Optional OpenAI-powered collection analysis and recommendations
- **Responsive UI** — Mobile-first Tailwind CSS design

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS v4, TanStack Query, React Router |
| Backend | Node.js, Express, TypeScript, Zod |
| Database | PostgreSQL, Prisma ORM |
| Auth | JWT + bcrypt, refresh token rotation |
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

## Prerequisites

- Node.js 20+
- npm 10+
- Docker & Docker Compose (recommended for local setup)
- PostgreSQL 16 (if running without Docker)

## Quick Start (Docker)

```bash
cd pokedex-manager
cp .env.example .env
docker compose up --build
```

- **Web:** http://localhost:5177
- **API:** http://localhost:4000
- **Health:** http://localhost:4000/health

## Quick Start (Manual)

### 1. Install dependencies

```bash
cd pokedex-manager
npm install
```

### 2. Start PostgreSQL

Use Docker for just the database:

```bash
docker compose up db -d
```

### 3. Configure environment

```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env
```

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
| `JWT_ACCESS_SECRET` | Yes | Min 16 chars; signs access tokens |
| `JWT_REFRESH_SECRET` | Yes | Min 16 chars; signs refresh tokens |
| `CORS_ORIGIN` | No | Frontend origin (default: `http://localhost:5177`) |
| `VITE_API_URL` | No | API URL for frontend (default: `http://localhost:4000`) |
| `OPENAI_API_KEY` | No | Enables AI collection insights (bonus) |
| `POKEAPI_CACHE_TTL_MS` | No | Cache TTL in ms (default: 600000) |

## API Reference

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Sign in |
| POST | `/api/auth/refresh` | No | Refresh tokens |
| POST | `/api/auth/logout` | No | Invalidate refresh token |
| GET | `/api/auth/me` | Yes | Current user profile |

### Pokémon

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/pokemon?limit&offset&search` | No | Paginated catalog |
| GET | `/api/pokemon/:idOrName` | No | Pokémon detail |

### Collection

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/collection` | Yes | List user's collection |
| GET | `/api/collection/stats` | Yes | Collection statistics |
| POST | `/api/collection` | Yes | Add Pokémon |
| PATCH | `/api/collection/:id` | Yes | Update entry |
| DELETE | `/api/collection/:id` | Yes | Remove entry |

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
- **CollectionEntry** — user's Pokémon with denormalized name/sprite snapshot

Unique constraint: one entry per `(userId, pokemonId)`.

## Testing

```bash
# Run all tests
npm test

# API only (requires DB for full suite; smoke tests hit PokéAPI)
npm run test -w @pokedex/api
```

## Deployment (Render)

1. Fork/push this repo to GitHub
2. Create a new **Blueprint** on [Render](https://render.com) pointing to `pokedex-manager/render.yaml`
3. Set `CORS_ORIGIN` to your static site URL
4. Set `VITE_API_URL` to your API service URL
5. Optionally set `OPENAI_API_KEY` for AI insights

Alternative: deploy API + DB on Railway, frontend on Vercel/Netlify with the same env vars.

## Assumed Exam Requirements

The exam PDF provided a summary without detailed day-by-day specs. This implementation covers:

1. Basic authentication (register/login/logout/JWT)
2. PokéAPI integration (list, search, detail)
3. Data persistence (PostgreSQL collection CRUD)
4. Responsive UI (mobile-first, all core pages)
5. Documentation (this README + architecture + API examples)
6. Bonus: AI insights via OpenAI (optional, env-gated)

## Project Structure

```
pokedex-manager/
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
