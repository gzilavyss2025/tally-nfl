// Fetch wrappers + spoiler-free selectors for ESPN's per-team endpoints —
// team identity, roster, and season schedule. All three confirmed CORS-open
// (`Access-Control-Allow-Origin: *`) live 2026-07-15; see docs/data-sources.md.
//
// Nothing here reads a score or a win/loss result — `selectScheduleRow`
// deliberately stops at "who, when, home or away, has it been played,"
// mirroring select.js's split. The result of a played game is reveal-only;
// see score.js's `selectWinner` and derive.js's `deriveTeamRecord`.

import { getJson } from './espn.js'
import { selectTeamIdentity } from './select.js'

export async function fetchTeamInfo(teamId, options) {
  return getJson(`/apis/site/v2/sports/football/nfl/teams/${teamId}`, options)
}

// Six position groups, always present even when empty: offense, defense,
// specialTeam, injuredReserveOrOut, suspended, practiceSquad (verified live
// 2026-07-15 against team 21 — PHI). Returns the raw grouped array; screens
// read `.position`/`.items` directly rather than through a selector here,
// since every field a roster row needs (name, jersey, position, headshot,
// college, experience, status) is already spoiler-free as ESPN returns it —
// there's no score-shaped field to strip the way selectScheduleRow strips one
// below.
export async function fetchTeamRoster(teamId, options) {
  return getJson(`/apis/site/v2/sports/football/nfl/teams/${teamId}/roster`, options)
}

export async function fetchTeamSchedule(teamId, season, options) {
  return getJson(
    `/apis/site/v2/sports/football/nfl/teams/${teamId}/schedule?season=${season}`,
    options,
  )
}

export function selectTeamIdentityFromTeamInfo(payload) {
  const team = payload?.team
  if (!team) return null
  return {
    id: team.id,
    abbr: team.abbreviation,
    name: team.displayName,
    logo: team.logo ?? team.logos?.[0]?.href ?? null,
    // "1st in NFC East" — ESPN's own precomputed standing string. Folded into
    // the same reveal-only aggregate as the record (see derive.js) rather
    // than shown eagerly: it's exactly as spoiler-relevant as a W-L record
    // (both are functions of every game played so far), see
    // docs/adr/0002-season-and-career-aggregates-are-sealed-as-one-block.md.
    standingSummary: team.standingSummary ?? '',
  }
}

// One row per game on the schedule — opponent, date, home/away, whether it's
// been played. NOT the result: `winner`/`score` are read only by score.js's
// selectWinner, only from inside a SealBox. `event` is a single entry from
// fetchTeamSchedule's `.events` array.
export function selectScheduleRow(event) {
  const comp = event?.competitions?.[0]
  const competitors = comp?.competitors ?? []
  const home = competitors.find((c) => c.homeAway === 'home')
  const away = competitors.find((c) => c.homeAway === 'away')
  return {
    id: event.id,
    date: event.date,
    weekNumber: event.week?.number ?? null,
    seasonType: event.seasonType?.type ?? null,
    home: home ? selectTeamIdentity(home.team) : null,
    away: away ? selectTeamIdentity(away.team) : null,
    completed: Boolean(comp?.status?.type?.completed),
    statusDetail: comp?.status?.type?.detail ?? '',
  }
}
