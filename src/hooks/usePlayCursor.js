import { useCallback, useState } from 'react'
import { canAdvance, canRetreat, nextCount, parseStoredCount, prevCount, storageKeyFor } from '../lib/playCursor.js'

// The NFL analog of bbsbh's `revealedThrough`, at the ADR-0001 play grain,
// stepped one play at a time in either direction per ADR-0003 (no scrubber,
// no jump-to-arbitrary-play). The value itself is just a count of how many
// plays are revealed — it carries no spoiler content, so reading/writing it
// outside a SealBox is fine; only the play data at each index is
// reveal-gated (see score.js's selectPlayReveal). The actual clamp/step
// arithmetic lives in lib/playCursor.js (plain functions, unit-tested
// without React) — this hook is just useState + localStorage around it.
//
// `total` isn't spoiler-safe to render as "N of 168" (an unusually high
// count could hint the game went to overtime before that's been revealed
// the normal way), so this hook never exposes it directly — only
// `canAdvance`/`canRetreat` booleans, which reveal availability, not count.
// ADR-0003 anticipated needing a separate explicit "enter overtime"
// acknowledgment gate; that turned out to be unnecessary once actually
// built this way, because a step-only cursor can only ever reach an
// overtime play by having already revealed every regulation play in order
// — there's no list/jump surface for an OT section to leak through the way
// ADR-0001 worried about. Worth folding back into ADR-0003 as a follow-up
// note.
//
// Keyed per game in localStorage; route.js marks the `game` route
// `remountOnNavigate: true` specifically so App.jsx remounts GamePage (and
// this hook) fresh when navigating game-to-game, rather than this hook's
// initial-state read racing a stale in-memory count from the previous game.
export function usePlayCursor(gameId, total) {
  const storageKey = storageKeyFor(gameId)

  const [revealedCount, setRevealedCount] = useState(() => {
    try {
      return parseStoredCount(window.localStorage.getItem(storageKey), total)
    } catch {
      return 0
    }
  })

  const persist = useCallback(
    (value) => {
      setRevealedCount(value)
      try {
        window.localStorage.setItem(storageKey, String(value))
      } catch {
        // Unavailable (private mode, quota) — cursor still works for this
        // session, just doesn't survive a reload.
      }
    },
    [storageKey],
  )

  const advance = useCallback(() => {
    persist(nextCount(revealedCount, total))
  }, [persist, revealedCount, total])

  const retreat = useCallback(() => {
    persist(prevCount(revealedCount, total))
  }, [persist, revealedCount, total])

  return {
    revealedCount,
    canAdvance: canAdvance(revealedCount, total),
    canRetreat: canRetreat(revealedCount),
    advance,
    retreat,
  }
}
