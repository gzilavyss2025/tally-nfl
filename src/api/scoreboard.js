// Per-week fetch against ESPN's undocumented NFL scoreboard endpoint — the
// full slate for one week of one season type. Verified live 2026-07-15
// against every week of the 2025 season (seasontype=1 preseason weeks 1-5,
// seasontype=2 regular weeks 1-18, seasontype=3 postseason weeks 1-5) — see
// src/lib/weeks.js for what each week number actually means (preseason and
// postseason don't just count 1..N cleanly, see that file's header comment).
//
// Each event's shape is close to, but not identical to, fetchGameSummary's
// (game.js) `header.competitions[0]` — see select.js/score.js's
// `competitionOf` helper, which reads either shape so those selectors work
// on a scoreboard event directly, without a full per-game summary fetch.

import { getJson } from './espn.js'

export async function fetchScoreboard({ year, seasonType, week }, options) {
  return getJson(
    `/apis/site/v2/sports/football/nfl/scoreboard?seasontype=${seasonType}&week=${week}&year=${year}`,
    options,
  )
}
