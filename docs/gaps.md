# Behavioral gaps and quirks

Known differences between what users might expect and what the app currently does. Last reviewed against the working tree (trades, evolve, shiny).

## High

### Missing Pokémon returns 503, not 404

`PokeApiClient.fetchJson` maps every non-OK PokéAPI response to `ServiceUnavailableError` (503), including upstream **404**. A bad id/name looks like an outage.

- Path: [`apps/api/src/lib/pokeApiClient.ts`](../apps/api/src/lib/pokeApiClient.ts)

### Render Blueprint `rootDir` / static `plan`

Static sites (`runtime: static`) **must not** set `plan: free` — Render rejects it with `no such plan free for service type web`. Omit `plan` for the static frontend; keep `plan: free` only on the Node web service and Postgres.

`rootDir` should be the repo root (omit the field, or use `.`). A nested `pokedex-manager` folder is not present in this repository.

### Docker Compose `VITE_API_URL` at runtime is ineffective

Vite bakes `VITE_*` at **build** time. Setting `VITE_API_URL` on the web container in Compose does not change a prebuilt image; rebuild with the correct `ARG`/`ENV` instead.

- Paths: [`docker-compose.yml`](../docker-compose.yml), [`apps/web/Dockerfile`](../apps/web/Dockerfile)

## Medium

### Shiny rate is 30% (demo), not game-accurate

On every `POST /api/collection`, the server rolls `Math.random() < 0.3` (`SHINY_CATCH_RATE`). The client cannot choose shiny. This is intentional for demos, not Pokédex odds.

- Path: [`apps/api/src/modules/collection/collectionService.ts`](../apps/api/src/modules/collection/collectionService.ts)

### “Try catch again” can 409 on a duplicate roll

Uniqueness is `(userId, pokemonId, isShiny)`. You may own normal and shiny of the same species. If you already have the form the roll produces, create returns **409** (common when hunting the other form). Retry until the other form rolls or both are owned.

### Accepted trades force status `traded`

On accept, both collection entries get `status: 'traded'`. There is no dedicated UI to change status after that; `PATCH /api/collection/:id` exists but the web app does not expose edit (nickname / notes / status).

- Paths: [`apps/api/src/modules/trade/tradeRepository.ts`](../apps/api/src/modules/trade/tradeRepository.ts), collection pages

### Wishlist cannot be traded; favorites and `traded` can

API and propose UI block `wishlist`. Favorites and already-`traded` entries can still be offered.

### Evolve is only on the detail page

`POST /api/collection/:id/evolve` and `GET /api/pokemon/:idOrName/evolutions` exist. The web UI exposes **Evolve** on [`PokemonDetailPage`](../apps/web/src/pages/PokemonDetailPage.tsx) only (not on the collection grid). Wishlist/favorite entries can evolve the same as caught.

Branching chains (e.g. Eevee) require choosing `targetPokemonId` in the UI.

### Collection edit UI is missing

API supports `PATCH` for nickname, notes, and status. The UI only adds, removes, evolves, and trades.

### Logout may leave tokens in the API client memory

Logout clears `localStorage` and React auth state. The shared `apiClient` instance may still hold tokens until reconfigured or the page reloads.

- Paths: [`apps/web/src/contexts/AuthContext.tsx`](../apps/web/src/contexts/AuthContext.tsx), [`apps/web/src/services/apiClient.ts`](../apps/web/src/services/apiClient.ts)

### Env loading order (local)

API preloads `apps/api/.env` then the repo-root `.env` with override. An empty root value can wipe a nonempty API-local value for the same key.

- Paths: [`apps/api/src/preloadEnv.ts`](../apps/api/src/preloadEnv.ts) (if present), [`apps/api/src/index.ts`](../apps/api/src/index.ts)

### Docs lag the product

README / architecture still under-document or omit parts of:

- Trades (`/app/trades`, `/api/trades`, `/api/users`)
- Evolve endpoints and UI
- Shiny catch and uniqueness `(userId, pokemonId, isShiny)`
- Collection status `traded`

README uniqueness text may still say one entry per `(userId, pokemonId)` only.

## Low

### Explore search has no pagination controls

Search returns a page of matches; the Previous/Next controls are hidden while searching.

### Catalog list hits PokéAPI heavily

List summaries may fetch details per result (N upstream calls). TTL cache helps, but cold pages are slow.

### AI insights are optional and provider-dependent

Requires `OPENAI_API_KEY` and/or `GEMINI_API_KEY`. Without keys, status reports disabled. Behavior depends on which keys are set.

### Tests are thin for new domains

API smoke covers health, validation, auth gates; little or no automated coverage for trade accept, evolve branching, shiny uniqueness, or PokéAPI 404 mapping. Web has a placeholder smoke test.

### Pending-trade locks

Entries in a **pending** trade cannot be deleted, evolved, or offered again until the trade is accepted, rejected, or cancelled.

## Intentional product rules (not bugs)

| Rule | Behavior |
|---|---|
| 1-for-1 trades | One offered entry and one requested entry |
| Same form conflict | Cannot receive a species+shiny form you already own |
| Shiny preserved | Evolve and trade keep `isShiny` and use shiny sprites when applicable |
| Snapshots | Trade history uses stored name/sprite/shiny even if the entry later evolves or is deleted |

## Quick verification checklist

- [ ] Missing name → currently **503** (gap)
- [ ] Add same species twice → second succeeds only if the other shiny form rolls
- [ ] Evolve from detail → navigates to new species; shiny stays shiny
- [ ] Trade accept → ownership swaps; both statuses become `traded`
- [ ] Wishlist → not selectable in propose UI; API rejects if forced
- [ ] Render Blueprint with default `rootDir` → expect failure until fixed
