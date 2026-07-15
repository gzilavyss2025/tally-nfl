// The 2025 season's full week list, in calendar order, across all three
// ESPN "season types" (1 = preseason, 2 = regular, 3 = postseason) — the
// single source of truth WeekPage's prev/next controls and season-type tabs
// read from, instead of each screen hand-rolling week-number math.
//
// Verified live 2026-07-15 against every seasontype/week combination ESPN's
// scoreboard endpoint accepts for 2025 (see src/api/scoreboard.js):
//
// - Preseason weeks run 1-4, not 1-3 as "3 preseason games per team" might
//   suggest: week 1 is the single Hall of Fame Game (1 event), weeks 2-4 are
//   the three full preseason slates (16 events each). Week 5 returns zero
//   events — preseason doesn't have one.
// - Postseason week 4 is NOT a playoff round. Wild Card/Divisional/Conference
//   Championship are weeks 1-3 as expected, but week 4 returns a single
//   "NFC VS AFC" event — the Pro Bowl, an exhibition — sandwiched before the
//   Super Bowl at week 5. Left in this list (it's a real ESPN week with a
//   real event) but labeled for what it is, so it doesn't read as a missing
//   or broken playoff round.
export const SEASON_TYPE = { PRESEASON: 1, REGULAR: 2, POSTSEASON: 3 }

const PRESEASON_WEEKS = [
  { seasonType: 1, week: 1, label: 'Hall of Fame Weekend' },
  { seasonType: 1, week: 2, label: 'Preseason Week 1' },
  { seasonType: 1, week: 3, label: 'Preseason Week 2' },
  { seasonType: 1, week: 4, label: 'Preseason Week 3' },
]

const REGULAR_WEEKS = Array.from({ length: 18 }, (_, i) => ({
  seasonType: 2,
  week: i + 1,
  label: `Week ${i + 1}`,
}))

const POSTSEASON_WEEKS = [
  { seasonType: 3, week: 1, label: 'Wild Card' },
  { seasonType: 3, week: 2, label: 'Divisional' },
  { seasonType: 3, week: 3, label: 'Conference Championship' },
  { seasonType: 3, week: 4, label: 'Pro Bowl' },
  { seasonType: 3, week: 5, label: 'Super Bowl' },
]

export const SEASON_WEEKS = [...PRESEASON_WEEKS, ...REGULAR_WEEKS, ...POSTSEASON_WEEKS]

export function weekIndex(seasonType, week) {
  const i = SEASON_WEEKS.findIndex((w) => w.seasonType === seasonType && w.week === week)
  return i === -1 ? SEASON_WEEKS.findIndex((w) => w.seasonType === SEASON_TYPE.REGULAR && w.week === 1) : i
}

export function weekAt(index) {
  return SEASON_WEEKS[Math.max(0, Math.min(SEASON_WEEKS.length - 1, index))]
}

export function weekLabel(seasonType, week) {
  return SEASON_WEEKS.find((w) => w.seasonType === seasonType && w.week === week)?.label ?? `Week ${week}`
}

export function seasonTypeLabel(seasonType) {
  if (seasonType === SEASON_TYPE.PRESEASON) return 'Preseason'
  if (seasonType === SEASON_TYPE.POSTSEASON) return 'Postseason'
  return 'Regular Season'
}
