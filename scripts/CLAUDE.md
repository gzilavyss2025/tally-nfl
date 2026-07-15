# scripts — build-time data generators

Node `.mjs` scripts that fetch/shape data the browser can't fetch directly
and write it into `public/data/*.json` for the app to read as a static
asset at runtime (the **build-time-fetch pattern**; see the `nflverse.js`
bullet in root `CLAUDE.md`'s "What's genuinely unbuilt" section). There is
exactly **one** script here today — `fetch-nflverse.mjs`. This file exists
so the pattern is documented before a second script needs it, not because
there's a catalog to maintain yet. The reader-side module
(`src/api/nflverse.js`) is documented in `src/api/CLAUDE.md`; this file
covers the generator only.

## Everyday commands

```bash
npm install
npm run dev            # dev server — 5174, try npm run dev:2..5 if taken (see root CLAUDE.md)
npm run build           # production build
npm run preview         # serve the built app
npm run lint            # eslint .
npm run data:nflverse   # node scripts/fetch-nflverse.mjs
```

There is no CI and no test suite yet, so there's no automated check that
`data:nflverse`'s output is fresh or well-formed. Verify a change by hand:
run `npm run data:nflverse`, confirm it prints a games/players count with no
error, then check `public/data/nflverse-games.json` /
`nflverse-players.json` / `nflverse-meta.json` exist and
`fetchNflverseGames()`/`fetchNflversePlayers()` (`src/api/nflverse.js`)
resolve against them from the dev server.

## `fetch-nflverse.mjs` → `public/data/nflverse-{games,players,meta}.json`

**Why this has to be a Node script and not a browser fetch:** nflverse
publishes `games.csv`/`players.csv` as GitHub release assets, but the
release-asset download redirects to Azure Blob Storage, and that redirect
target sends no `Access-Control-Allow-Origin` header at all — a browser
`fetch()` fails CORS on that hop regardless of retry/timeout handling
(verified 2026-07-15, `docs/data-sources.md`). Node has no CORS enforcement,
so the script just downloads the CSVs directly, then writes the trimmed
result into `public/data/` where Vite serves it as an ordinary static file
`src/api/nflverse.js` can `fetch()` at runtime with zero CORS exposure.

What it does, source → output:
- Fetches `games.csv` and `players.csv` from
  `github.com/nflverse/nflverse-data/releases/download/...` (URLs are
  `GAMES_URL`/`PLAYERS_URL` constants in the script).
- Parses each with a hand-rolled RFC4180 CSV parser (`parseCsv`) — not a
  dependency, because the one thing a naive `.split(',')` gets wrong is
  quoted fields with embedded commas (e.g. headshot URLs), and that was
  confirmed against `players.csv` before writing it.
- Projects each row down to a fixed column allowlist (`GAMES_COLUMNS`,
  `PLAYERS_COLUMNS`) — the raw files carry many more fields than this app
  needs; empty strings become `null`.
- Trims `players.csv` to `last_season >= MIN_LAST_SEASON` (2015) — the raw
  file has every player since the 1970s (25k+ rows), and a "current season"
  companion app doesn't need most of that history. Widen `MIN_LAST_SEASON`
  and re-run if a feature needs older lookups.
- Writes three files: `nflverse-games.json`, `nflverse-players.json`, and
  `nflverse-meta.json` (generation timestamp, source URLs, `MIN_LAST_SEASON`,
  and before/after row counts — a quick sanity check without opening the
  full data files).

**Cadence: unresolved, hand-run only.** There's no `.github` directory in
this repo yet, so unlike `bbsbh`'s nightly-cron generators there is no CI
workflow to schedule this on. Re-run `npm run data:nflverse` by hand to
refresh (nflverse's own files update periodically as seasons progress); the
cron/scheduling question is open, not decided against — don't invent a
workflow file to close it.

## If a second `data:*` script is ever needed

Follow the same shape this one establishes: a source is CORS-blocked (or,
short of that, just too large/unofficial to hit from the browser on every
page load) → a Node script under `scripts/` downloads and trims it →
writes JSON into `public/data/*.json` → a paired reader in `src/api/`
fetches that static file at runtime and surfaces a clear error (pointing at
the `npm run data:*` command) if the file is missing. Add the npm script
alongside `data:nflverse` in `package.json`, and document it in a new
section above rather than growing this one script's section to cover
something it doesn't do.
