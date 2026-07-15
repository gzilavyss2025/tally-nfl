// TheSportsDB — crowdsourced artwork fallback (logos/badges), not a data
// source of record. Free v1 API, shared key "123", 30 req/min, CORS-open
// (Access-Control-Allow-Origin: * verified 2026-07-15).
//
// Known limitation, confirmed live: `search_all_teams.php?l=NFL` returns
// only 10 of the 32 teams on the free tier, and the `idESPN` field that
// would otherwise be a free crosswalk to ESPN's team id is null/0 on every
// row returned. Don't rely on this for coverage or for ID-joining — use
// src/data/teams.js (keyed by abbreviation, which does match ESPN's
// strTeamShort for the teams TheSportsDB does return) if a badge is needed
// for a specific team, and treat a miss as expected, not a bug.

const BASE = 'https://www.thesportsdb.com/api/v1/json/123'

export async function fetchTheSportsDbNflTeams() {
  const res = await fetch(`${BASE}/search_all_teams.php?l=NFL`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`TheSportsDB API ${res.status} for search_all_teams`)
  const data = await res.json()
  return data.teams ?? []
}
