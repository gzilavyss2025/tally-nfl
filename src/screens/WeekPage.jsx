import { fetchScoreboard } from '../api/scoreboard.js'
import { useAsync } from '../hooks/useAsync.js'
import { useNav } from '../lib/nav.js'
import { weekPath } from '../lib/route.js'
import {
  SEASON_TYPE,
  SEASON_WEEKS,
  weekAt,
  weekIndex,
  weekLabel,
  seasonTypeLabel,
} from '../lib/weeks.js'
import { GameCard } from '../components/GameCard.jsx'
import { AsyncGate } from '../components/AsyncGate.jsx'

const TABS = [SEASON_TYPE.PRESEASON, SEASON_TYPE.REGULAR, SEASON_TYPE.POSTSEASON]

// Screen 1: the week slate — the NFL equivalent of bbsbh's GameSelect
// (a whole day's games), but week-shaped rather than day-shaped, since a
// week is football's actual scheduling unit. One SealBox per game (see
// GameCard) instead of the drive-level reveal cursor ADR-0001 designed —
// that cursor isn't implemented yet (see src/CLAUDE.md's "Reveal
// granularity: decided, not implemented"), so this wireframe seals the
// whole final score per game, same grain as App.jsx's original demo.
export function WeekPage({ seasonType, week, season }) {
  const navigate = useNav()
  const { loading, error, data } = useAsync(
    () => fetchScoreboard({ year: season, seasonType, week }),
    [season, seasonType, week],
  )

  const gate = AsyncGate({ loading, error, data, noun: 'week' })

  const idx = weekIndex(seasonType, week)
  const goToIndex = (i) => {
    const w = weekAt(i)
    navigate(weekPath(w.seasonType, w.week))
  }
  const goToTab = (tab) => {
    // Land on that season type's first week rather than trying to preserve
    // a week NUMBER across types (postseason week 3 isn't "the same slot"
    // as regular-season week 3).
    const first = SEASON_WEEKS.find((w) => w.seasonType === tab)
    navigate(weekPath(first.seasonType, first.week))
  }

  const events = data?.events ?? []

  return (
    <div className="screen screen--week paper-grid">
      <header className="weekhead">
        <h1 className="t-label weekhead__title">Tally NFL</h1>
        <div className="weektabs" role="tablist" aria-label="Season type">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={seasonType === tab}
              className={`weektabs__tab${seasonType === tab ? ' is-active' : ''}`}
              onClick={() => goToTab(tab)}
            >
              {seasonTypeLabel(tab)}
            </button>
          ))}
        </div>
        <div className="weeknav">
          <button
            type="button"
            className="weeknav__arrow"
            onClick={() => goToIndex(idx - 1)}
            disabled={idx <= 0}
            aria-label="Previous week"
          >
            ‹
          </button>
          <span className="weeknav__label">{weekLabel(seasonType, week)}</span>
          <button
            type="button"
            className="weeknav__arrow"
            onClick={() => goToIndex(idx + 1)}
            disabled={idx >= SEASON_WEEKS.length - 1}
            aria-label="Next week"
          >
            ›
          </button>
        </div>
      </header>

      {gate || (
        <ul className="gamelist">
          {events.length === 0 && <li className="t-label gamelist__empty">No games scheduled.</li>}
          {events.map((event) => (
            <GameCard key={event.id} event={event} />
          ))}
        </ul>
      )}
    </div>
  )
}
