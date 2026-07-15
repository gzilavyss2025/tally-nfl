// Runtime loader for nflverse reference data — fetches the trimmed static
// JSON that scripts/fetch-nflverse.mjs generates into public/data/, NOT
// nflverse's own GitHub release URLs. Those release assets redirect to
// Azure Blob Storage, which sends no Access-Control-Allow-Origin header, so
// a browser `fetch()` against them fails CORS regardless of retry/timeout
// handling (verified 2026-07-15 — see docs/data-sources.md). nflverse itself
// documents these as static snapshot files, not a live API, so treating
// them as build-time input rather than a per-request fetch matches how
// they're meant to be used, not just a CORS workaround.
//
// Run `npm run data:nflverse` to regenerate public/data/nflverse-*.json
// from the latest nflverse release. If those files are missing (fresh
// checkout, script never run), these calls 404 — that's surfaced to the
// caller rather than silently swallowed, same as api/game.js's ESPN fetch.

let gamesCache = null
let playersCache = null

async function fetchJson(path) {
  const res = await fetch(path)
  if (!res.ok) {
    throw new Error(
      `${path} -> HTTP ${res.status}. Run "npm run data:nflverse" to generate public/data/*.json.`,
    )
  }
  return res.json()
}

// Each row carries season/week/team abbreviations (nflverse's own, see
// src/data/teams.js for the crosswalk to ESPN's) plus `espn` — the ESPN
// event id for that game, nflverse's own crosswalk column. This is the
// master key for joining an ESPN summary response to nflverse's schedule
// data for the same game.
export async function fetchNflverseGames() {
  if (!gamesCache) gamesCache = fetchJson('/data/nflverse-games.json')
  return gamesCache
}

// Each row carries gsis_id (nflverse's own primary key) alongside espn_id,
// pfr_id, pff_id, otc_id, smart_id, nfl_id — the master player-identity
// crosswalk. Trimmed to players active since 2015 or later by
// scripts/fetch-nflverse.mjs; see that script to widen the window.
export async function fetchNflversePlayers() {
  if (!playersCache) playersCache = fetchJson('/data/nflverse-players.json')
  return playersCache
}
