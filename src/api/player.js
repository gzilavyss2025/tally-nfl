// Fetch wrapper for ESPN's athlete career-stats endpoint. Lives on a
// different host (site.web.api.espn.com, not site.api.espn.com) than every
// other module in this folder — confirmed CORS-open live 2026-07-15, same as
// the site.api host (see docs/data-sources.md). A bare `/athletes/{id}`
// lookup on the usual site.api host 404s without a team-scoped path, so
// player bio (name, jersey, position, headshot, college, experience) comes
// from team.js's fetchTeamRoster instead — this module is stats only.
//
// The fetch itself is safe to call eagerly (a raw response produces no DOM,
// same reasoning as game.js's fetchGameSummary). The season/career totals it
// returns are NOT spoiler-free, though — see derive.js's selectCareerStats,
// which is reveal-only, and
// docs/adr/0002-season-and-career-aggregates-are-sealed-as-one-block.md for why.

import { getJson } from './espn.js'

const WEB_API_BASE = 'https://site.web.api.espn.com'

export async function fetchAthleteSeasonStats(athleteId, options) {
  return getJson(`/apis/common/v3/sports/football/nfl/athletes/${athleteId}/stats`, {
    ...options,
    base: WEB_API_BASE,
  })
}

// A player's bio row out of a team roster payload (see fetchTeamRoster) —
// spoiler-free, safe at render top-level. Searches every position group
// (offense/defense/specialTeam/injuredReserveOrOut/suspended/practiceSquad)
// since a caller only has the player id, not which group they're filed
// under. Returns null if this roster doesn't carry that player (a bad id, or
// a player who's since left the team the route's teamId points at).
export function selectPlayerBio(rosterPayload, athleteId) {
  const groups = rosterPayload?.athletes ?? []
  for (const group of groups) {
    const item = (group.items ?? []).find((p) => String(p.id) === String(athleteId))
    if (item) {
      return {
        id: item.id,
        name: item.fullName,
        jersey: item.jersey ?? '',
        positionAbbr: item.position?.abbreviation ?? '',
        positionName: item.position?.displayName ?? '',
        heightWeight: item.displayHeight && item.displayWeight ? `${item.displayHeight}, ${item.displayWeight}` : '',
        age: item.age ?? null,
        college: item.college?.name ?? '',
        experienceYears: item.experience?.years ?? null,
        headshot: item.headshot?.href ?? null,
        status: item.status?.name ?? '',
        group: group.position,
      }
    }
  }
  return null
}
