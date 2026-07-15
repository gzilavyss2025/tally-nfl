// Reveal-only derivations — callable ONLY from inside a SealBox's reveal
// render function, never at render top-level or in an eager useMemo. This is
// the module src/CLAUDE.md and src/api/CLAUDE.md both flag as "not built
// yet, follow bbsbh's derive.js/linescore.js pattern" — TeamPage and
// PlayerPage are the first screens that need spoiler-gated math beyond
// picking a single field off a response, so this is that module.
//
// Both functions here aggregate across MANY games (a season of results, a
// player's career), which ADR-0001's per-drive reveal model doesn't cover —
// see docs/adr/0002-season-and-career-aggregates-are-sealed-as-one-block.md
// for why everything in this file is sealed as one block per page rather
// than left unsealed or gated per-game.

import { selectWinner } from './score.js'

// Win-loss-tie record for `teamId` across a season's worth of schedule
// events (fetchTeamSchedule's `.events`). Reuses score.js's selectWinner
// per-event rather than reading `winner` directly, so a tie (winner:false on
// both competitors) is counted correctly instead of as a loss.
export function deriveTeamRecord(scheduleEvents, teamId) {
  let wins = 0
  let losses = 0
  let ties = 0
  for (const event of scheduleEvents ?? []) {
    const result = selectWinner(event, teamId)
    if (result === 'W') wins += 1
    else if (result === 'L') losses += 1
    else if (result === 'T') ties += 1
  }
  return { wins, losses, ties }
}

// Shapes fetchAthleteSeasonStats' raw payload (player.js) into one row per
// stat category (rushing/receiving/passing/defense/kicking — whichever the
// player has) with one column set per season plus a career-totals row.
// Verified live 2026-07-15 against athlete 3929630 (Saquon Barkley): each
// category carries parallel `labels`/`names`/`displayNames` arrays (column
// headers) and a `statistics` array of { season, teamId, stats: [...] }
// rows, `stats` positionally matching `labels` — plus a `totals` array in
// the same column order.
export function selectCareerStats(statsPayload) {
  const categories = statsPayload?.categories ?? []
  return categories.map((category) => ({
    key: category.name,
    title: category.displayName,
    labels: category.labels ?? [],
    seasons: (category.statistics ?? []).map((row) => ({
      year: row.season?.year ?? null,
      values: row.stats ?? [],
    })),
    totals: category.totals ?? [],
  }))
}
