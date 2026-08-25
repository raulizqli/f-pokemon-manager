# Architecture

## Overview

PokéDex Manager follows a **monorepo** structure with three packages:

- `@pokedex/shared` — Zod schemas and TypeScript types shared between frontend and backend
- `@pokedex/api` — Express REST API with layered architecture
- `@pokedex/web` — React single-page application

## Request Flow

```text
Browser (React)
    │
    ▼ TanStack Query + apiClient (JWT interceptor)
Express Router
    │
    ▼ Auth Middleware (optional JWT parsing)
Controller (input validation via Zod)
    │
    ▼
Service (business logic)
    │
    ├──► Repository (Prisma → PostgreSQL)
    └──► PokeApiClient (fetch → PokéAPI, TTL cache)
```

## Backend Layers

### Routes (`modules/routes/`)

Define HTTP endpoints and wire them to controllers. Apply `requireAuth` middleware on protected routes.

### Controllers (`modules/routes/controllers.ts`)

Parse and validate request input using Zod schemas from `@pokedex/shared`. Delegate to services. Return JSON responses.

### Services

- **AuthService** — registration, login, access JWT issuance, opaque refresh rotation, password hashing
- **PokemonService** — catalog, detail, and next evolutions via PokeApiClient
- **CollectionService** — catch (shiny roll), update, delete, evolve; ownership → 403; pending-trade locks; unique conflicts → 409
- **TradeService** — trainer discovery, propose / accept / reject / cancel with form-uniqueness rules
- **AiService** — optional OpenAI insights with Gemini fallback (env-gated)

### Repositories

- **UserRepository** — user CRUD lookups and trainer search
- **RefreshTokenRepository** — refresh token persistence
- **CollectionRepository** — collection entries and stats aggregation
- **TradeRepository** — trade CRUD; create/accept run in transactions with `FOR UPDATE` on involved rows

Repositories encapsulate Prisma (and raw lock queries for trades). Partial unique indexes on pending trade entry IDs live in SQL migrations (Prisma cannot express `WHERE status = 'pending'`).

### Adapters

**PokeApiClient** wraps the external PokéAPI:

- Normalizes responses to shared DTOs (including shiny sprite URLs)
- TTL in-memory cache for lists, details (keyed by name and id), species, and evolution chains
- Search loads the full name catalog once (then filters in memory)
- Upstream **404** → `NotFoundError`; other failures → `ServiceUnavailableError`

## Frontend Architecture

### State Management

- **AuthContext** — user session in localStorage; configures `apiClient`; clears tokens **and** `apiClient` on logout / `/me` failure / refresh failure
- **TanStack Query** — Pokémon list/details/evolutions, collection, stats, trades, AI status/insights (insights only after explicit Generate on the dashboard)

### Routing

| Route | Access | Page |
|---|---|---|
| `/` | Public | Landing |
| `/login`, `/register` | Public | Auth forms |
| `/app` | Protected | Dashboard |
| `/app/explore` | Protected | Catalog |
| `/app/collection` | Protected | Collection |
| `/app/trades` | Protected | Trades inbox |
| `/app/trades/new/:userId` | Protected | Propose trade |
| `/app/pokemon/:id` | Protected | Detail + catch / evolve |

### API Client

`apiClient` attaches Bearer tokens, serializes concurrent refresh attempts, refreshes on **401** only, and exposes `clear()` so logout does not leave in-memory credentials.

## Domain notes

### Collection uniqueness

`(userId, pokemonId, isShiny)` — normal and shiny are separate slots. Catch rolls shiny at `SHINY_CATCH_RATE = 0.3`.

### Trades

1-for-1; wishlist blocked; cannot create a second pending offer on the same entry; accept re-validates ownership inside a transaction and sets both entries to `caught` after the swap. Trade rows keep Pokémon snapshots (including shiny) for history.

### Evolve

Uses PokéAPI evolution chain; preserves `isShiny` and sprite choice; conflicts if the target form is already owned.

## Security

- Passwords hashed with bcrypt (12 rounds)
- Refresh tokens: opaque random bytes, stored as SHA-256 hashes (never plain text in DB)
- Access tokens short-lived JWT (15m default), signed with `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET` is validated at startup but not used for signing (opaque refresh model)
- Collection mutations scoped to authenticated `userId`; wrong owner → **403** (not 401)
- CORS restricted to configured origin
- Tokens live in **localStorage** (XSS-sensitive); suitable for the exam demo, not hardened production sessions

## Caching Strategy

PokeApiClient uses in-memory TTL cache (default 10 minutes):

- List responses keyed by `limit:offset`
- Detail responses keyed by id and name
- Full name list cached for search
- Species and evolution chain URLs cached

Warm traffic reuses detail cache for list summaries; cold pages still fan out one detail fetch per result.

## Ops notes

- **Vite** env (`VITE_*`) is build-time; Docker Compose passes `VITE_API_URL` as a build arg; Render static site must set it before build
- API env load order: `apps/api/.env` then repo-root `.env` with override (`preloadEnv.ts`)
- Render static services must omit `plan`

## Future Improvements

- Integration tests for concurrent trades, shiny uniqueness, and evolve branches
- httpOnly refresh cookies (or documented XSS threat model) and atomic server-side refresh rotation
- Rate limits on auth/AI; helmet; JSON body size limit
- Denser PokéAPI list payload / timeouts to cut cold N+1 cost
- Collection edit UI for existing PATCH
- Redis cache for multi-instance API deployments
- E2E tests with Playwright
