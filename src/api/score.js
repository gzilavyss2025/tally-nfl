// Reveal-only: the final score and the win/loss result. Callable ONLY from
// inside a SealBox's reveal render function (see SealBox.jsx and CLAUDE.md's
// spoiler-safety section) — never at render top-level or in an eager
// useMemo. Reads the same `competitors[].score`/`.winner` fields
// select.js's selectMatchup() deliberately leaves untouched, so importing
// this module is fine eagerly — it's CALLING these functions before reveal
// that would break the spoiler rule.

// Duplicated from select.js rather than imported: this file must stay
// independently reveal-only-safe to import (a bare function reference reveals
// nothing), and pulling in select.js's tree for one three-line helper isn't
// worth coupling the two modules together.
function competitionOf(x) {
  return x?.header?.competitions?.[0] ?? x?.competitions?.[0] ?? null
}

export function selectFinalScore(x) {
  const competitors = competitionOf(x)?.competitors ?? []
  const home = competitors.find((c) => c.homeAway === 'home')
  const away = competitors.find((c) => c.homeAway === 'away')
  return {
    home: home ? { abbr: home.team.abbreviation, score: Number(home.score) } : null,
    away: away ? { abbr: away.team.abbreviation, score: Number(away.score) } : null,
  }
}

// Duplicated flatten, not shared with select.js's selectPlayList, for the
// same independently-reveal-only-safe reason as competitionOf above — this
// walk touches the raw play objects (which carry `text`/`scoringPlay`/
// scores), so it must never be reachable from an eager import.
function flattenPlays(summary) {
  const drives = summary?.drives?.previous ?? []
  const plays = []
  for (const drive of drives) {
    for (const play of drive.plays ?? []) plays.push(play)
  }
  return plays
}

// The play at `index` in the same chronological order select.js's
// selectPlayList walks (fetchGameSummary's `drives.previous[].plays[]`) —
// this is the ADR-0001 reveal unit itself: `text` (the play description,
// which spells out TOUCHDOWN/INTERCEPTION/etc. on a scoring or turnover
// play — verified live against event 401772830's 4th play,
// "...for 50 yards, TOUCHDOWN"), `scoringPlay`, and the score AS OF this
// play. Call only from inside a SealBox render function for a play not yet
// revealed. `GamePage`'s already-revealed play log also calls this, but
// only for indices strictly below the persisted play cursor — i.e. plays
// the viewer has already tapped through — which stays inside the spirit of
// "reveal-only, gated by reveal state" even though there's no SealBox
// wrapper left around a play once it's joined the log.
export function selectPlayReveal(summary, index) {
  const play = flattenPlays(summary)[index]
  if (!play) return null
  return {
    text: play.text ?? '',
    scoringPlay: Boolean(play.scoringPlay),
    awayScore: Number(play.awayScore ?? 0),
    homeScore: Number(play.homeScore ?? 0),
  }
}

// 'W' / 'L' / 'T' for the given team in this game, or null if the game
// hasn't finished (or the team isn't in it). Ties are real in the NFL
// (regular season only) — ESPN represents one as `winner: false` on BOTH
// competitors, verified live 2026-07-15 against event 401772921 (GB @ DAL,
// 2025 Week 4, Final 40-40), so "not a win" alone isn't enough to call it a
// loss.
export function selectWinner(x, teamId) {
  const comp = competitionOf(x)
  if (!comp?.status?.type?.completed) return null
  const competitors = comp.competitors ?? []
  const mine = competitors.find((c) => String(c.team?.id) === String(teamId))
  if (!mine) return null
  if (mine.winner === true) return 'W'
  const opponent = competitors.find((c) => c !== mine)
  return opponent?.winner === false ? 'T' : 'L'
}
