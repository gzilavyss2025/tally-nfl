// Spoiler-free selectors over a game — safe to call at render top-level. The
// final score itself is NOT here; see score.js, which is reveal-only.
//
// `competitionOf` reads either shape this app fetches a game in: a full
// `fetchGameSummary` response (game.js, `.header.competitions[0]`) or a
// single event out of `fetchScoreboard` (scoreboard.js, `.competitions[0]`
// directly, no `.header` wrapper) — verified live 2026-07-15 that both carry
// the same `competitors[]`/`status` shape underneath, so one selector body
// covers a week-slate card and a single-game screen alike.
function competitionOf(x) {
  return x?.header?.competitions?.[0] ?? x?.competitions?.[0] ?? null
}

export function selectMatchup(x) {
  const comp = competitionOf(x)
  const competitors = comp?.competitors ?? []
  const home = competitors.find((c) => c.homeAway === 'home')
  const away = competitors.find((c) => c.homeAway === 'away')
  const status = comp?.status?.type ?? {}
  return {
    home: home ? selectTeamIdentity(home.team) : null,
    away: away ? selectTeamIdentity(away.team) : null,
    statusDetail: status.detail ?? '',
    // 'pre' | 'in' | 'post' — GameCard uses this to show a kickoff time
    // instead of a SealBox for a game that hasn't started (nothing to seal).
    state: status.state ?? '',
    completed: Boolean(status.completed),
  }
}

// One entry per play, flattened out of `drives.previous[].plays[]`
// (fetchGameSummary only — a scoreboard event has no `drives`) in the same
// chronological order the feed carries, which per ADR-0001 is the reveal
// cursor's own order. Deliberately spoiler-free: down/distance, clock,
// period, and who has the ball are never score-relevant, so this is safe to
// call eagerly for every play up front (e.g. to size the play-cursor's
// `total`, or to label the next sealed play before it's tapped). The
// play's `text`/`type`/`scoringPlay`/`awayScore`/`homeScore` are NOT here —
// see score.js's `selectPlayReveal`, which re-derives from the same raw
// `drives` structure independently rather than wrapping this function, so
// this selector's return shape can never accidentally start carrying a
// spoiler field later.
export function selectPlayList(summary) {
  const drives = summary?.drives?.previous ?? []
  const plays = []
  for (const drive of drives) {
    const driveTeam = drive.team ? selectTeamIdentity(drive.team) : null
    for (const play of drive.plays ?? []) {
      plays.push({
        period: play.period?.number ?? null,
        clock: play.clock?.displayValue ?? '',
        downDistance: play.start?.shortDownDistanceText ?? '',
        possession: play.start?.possessionText ?? '',
        driveTeam,
      })
    }
  }
  return plays
}

// Team identity/logo is never a spoiler — used both here and by team.js's
// own selectors, which is why it's factored out rather than inlined twice.
// A scoreboard event's team object carries a singular `logo` string; a game
// summary's carries a `logos` array (both verified live 2026-07-15) — this
// reads whichever is present instead of assuming one shape.
export function selectTeamIdentity(team) {
  if (!team) return null
  return {
    id: team.id,
    abbr: team.abbreviation,
    name: team.displayName,
    logo: team.logo ?? team.logos?.[0]?.href ?? null,
  }
}
