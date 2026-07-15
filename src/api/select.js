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
