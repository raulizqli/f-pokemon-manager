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

- **AuthService** — registration, login, token issuance/refresh, password hashing
- **PokemonService** — delegates to PokeApiClient
- **CollectionService** — collection CRUD with ownership checks
- **AiService** — optional OpenAI insights (env-gated)

### Repositories

- **UserRepository** — user CRUD lookups
- **RefreshTokenRepository** — refresh token persistence
- **CollectionRepository** — collection entries and stats aggregation

Repositories encapsulate all Prisma queries, keeping services free of ORM details.

### Adapters

**PokeApiClient** wraps the external PokéAPI:
- Normalizes responses to shared DTOs
- Implements TTL in-memory cache
- Handles search by caching all Pokémon names
- Maps upstream errors to `ServiceUnavailableError`

## Frontend Architecture

### State Management

- **AuthContext** — user session, token storage in localStorage, token refresh via apiClient interceptor
- **TanStack Query** — server state for Pokémon list, details, collection, stats, AI insights

### Routing

| Route | Access | Page |
|---|---|---|
| `/` | Public | Landing |
| `/login`, `/register` | Public | Auth forms |
| `/app/*` | Protected | Dashboard, Explore, Collection, Detail |

### API Client

`apiClient` attaches Bearer tokens, automatically refreshes on 401, and persists updated tokens.

## Security

- Passwords hashed with bcrypt (12 rounds)
- Refresh tokens stored as SHA-256 hashes (never plain text in DB)
- Access tokens short-lived (15m default)
- Collection operations scoped to authenticated userId
- CORS restricted to configured origin

## Caching Strategy

PokeApiClient uses in-memory TTL cache (default 10 minutes):
- List responses keyed by `limit:offset`
- Detail responses keyed by id/name
- Full name list cached for search

This reduces PokéAPI load while keeping data reasonably fresh.

## Future Improvements

- Redis cache for multi-instance API deployments
- MCP server for conversational collection assistant
- Image upload + vision model for card identification
- OAuth social login
- E2E tests with Playwright
