// Sleeper's full NFL player directory — documented, free, no key, generous
// rate limit (~1000 req/min), and CORS-open for direct browser fetch
// (Access-Control-Allow-Origin: * verified 2026-07-15, unlike nflverse's
// files — see src/api/nflverse.js). The payload is the whole league's
// player universe (~5MB), so callers must not fetch this per-render; the
// module-level cache below makes repeated calls within a session free.
//
// Deliberately NOT persisted to localStorage: 5MB comfortably blows past
// typical per-origin localStorage quotas (5-10MB) once combined with
// anything else the app stores, and a QuotaExceededError there is an ugly
// failure mode for data that's just a cache. Cache lives for the tab's
// lifetime only; a hard reload re-fetches. Revisit with IndexedDB if a
// screen ends up calling this on every load.
//
// Each player record carries cross-platform IDs (espn_id, gsis_id,
// sportradar_id, yahoo_id, fantasy_data_id, rotowire_id) — see
// docs/data-sources.md for how these line up with ESPN/nflverse IDs.

const BASE = 'https://api.sleeper.app/v1'

let cache = null
let inflight = null

export async function fetchSleeperPlayers({ force = false } = {}) {
  if (cache && !force) return cache
  if (inflight && !force) return inflight

  inflight = fetch(`${BASE}/players/nfl`, { headers: { Accept: 'application/json' } })
    .then((res) => {
      if (!res.ok) throw new Error(`Sleeper API ${res.status} for /players/nfl`)
      return res.json()
    })
    .then((data) => {
      cache = data
      inflight = null
      return data
    })
    .catch((err) => {
      inflight = null
      throw err
    })

  return inflight
}
