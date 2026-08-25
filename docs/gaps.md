# Behavioral gaps and quirks

Known differences between what users might expect and what the app currently does. Last reviewed against the working tree (trades, evolve, shiny, hardening).

## High

### Tokens in localStorage (XSS)

Access and refresh tokens live in `localStorage` and the in-memory `apiClient`. Any XSS can exfiltrate them. Suitable for the exam demo; production would use httpOnly cookies (or similar). CORS is Bearer-only (`credentials` not required).

- Paths: [`apps/web/src/contexts/AuthContext.tsx`](../apps/web/src/contexts/AuthContext.tsx), [`apps/web/src/services/apiClient.ts`](../apps/web/src/services/apiClient.ts)

### Render Blueprint `rootDir` / static `plan`

Static sites (`runtime: static`) **must not** set `plan: free` — Render rejects it with `no such plan free for service type web`. Omit `plan` for the static frontend; keep `plan: free` only on the Node web service and Postgres.

`rootDir` should be the repo root (omit the field, or use `.`). A nested `pokedex-manager` folder is not present in this repository.

### Docker Compose `VITE_API_URL` is build-time

Vite bakes `VITE_*` at **build** time. Compose passes `VITE_API_URL` as a **build arg** to the web image. Changing it requires `docker compose up --build` (or rebuild the web service). Runtime `environment:` on the web container cannot rewrite a prebuilt SPA.

- Paths: [`docker-compose.yml`](../docker-compose.yml), [`apps/web/Dockerfile`](../apps/web/Dockerfile)

## Medium

### Shiny rate is 30% (demo), not game-accurate

On every `POST /api/collection`, the server rolls `Math.random() < 0.3` (`SHINY_CATCH_RATE`). The client cannot choose shiny. This is intentional for demos, not Pokédex odds.

- Path: [`apps/api/src/modules/collection/collectionService.ts`](../apps/api/src/modules/collection/collectionService.ts)

### “Try catch again” can 409 on a duplicate roll

Uniqueness is `(userId, pokemonId, isShiny)`. You may own normal and shiny of the same species. If you already have the form the roll produces, create returns **409** (common when hunting the other form). Retry until the other form rolls or both are owned.

### Wishlist cannot be traded; favorites can

API and propose UI block `wishlist`. Favorites can still be offered.

### Evolve is only on the detail page

`POST /api/collection/:id/evolve` and `GET /api/pokemon/:idOrName/evolutions` exist. The web UI exposes **Evolve** on [`PokemonDetailPage`](../apps/web/src/pages/PokemonDetailPage.tsx) only (not on the collection grid). Wishlist/favorite entries can evolve the same as caught.

Branching chains (e.g. Eevee) require choosing `targetPokemonId` in the UI.

### Env loading order (local)

API preloads `apps/api/.env` then the repo-root `.env` with override. An empty root value can wipe a nonempty API-local value for the same key.

- Paths: [`apps/api/src/preloadEnv.ts`](../apps/api/src/preloadEnv.ts) (if present), [`apps/api/src/index.ts`](../apps/api/src/index.ts)

## Low

### Explore search has no pagination controls

Search returns a page of matches; the Previous/Next controls are hidden while searching.

### Catalog list still fetches types per result

List builds id/name/sprite without waiting on detail for artwork (CDN URL from list id). Types still require capped parallel detail fetches (concurrency 5, 8s timeout). Search loads the name catalog in one high-limit list call.

### AI insights are optional and rate-limited

Requires `OPENAI_API_KEY` and/or `GEMINI_API_KEY`. Dashboard only calls insights after **Generate insights**. `POST /api/ai/insights` is rate-limited (5/min/IP); auth login/register/refresh are 20/min/IP.

### Pending-trade locks

Entries in a **pending** trade cannot be updated, deleted, evolved, or offered again until the trade is accepted, rejected, or cancelled. DB partial unique indexes also enforce one pending trade per entry. Collection UI shows the API error when edit/remove hits that lock.

## Intentional product rules (not bugs)

| Rule | Behavior |
|---|---|
| 1-for-1 trades | One offered entry and one requested entry |
| Same form conflict | Cannot receive a species+shiny form you already own |
| Shiny preserved | Evolve and trade keep `isShiny` and use shiny sprites when applicable |
| Snapshots | Trade history uses stored name/sprite/shiny even if the entry later evolves or is deleted |
| After accept | Ownership swaps; both entries become `caught` (usable again) |

## Quick verification checklist

- [ ] Missing name → **404** `NOT_FOUND`
- [ ] Add same species twice → second succeeds only if the other shiny form rolls
- [ ] Evolve from detail → navigates to new species; shiny stays shiny
- [ ] Trade accept → ownership swaps; both statuses become `caught`
- [ ] Wishlist → not selectable in propose UI; API rejects if forced
- [ ] Logout → subsequent API calls are unauthenticated without reload
- [ ] Dashboard AI → no insights request until Generate is clicked
- [ ] Collection Edit → nickname/notes/status via PATCH
