import { useAsync } from './useAsync.js'
import { AsyncGate } from '../components/AsyncGate.jsx'

// The fetch-a-page boilerplate every screen was repeating by copy-paste
// (`useAsync` + a `back = () => window.history.back()` + an `AsyncGate`
// call wired to it) factored into one hook, so screen #5 and beyond get it
// for free instead of re-copying the same four lines a fifth time.
//
// Returns `gate` as a value (JSX or null), not a component — callers use it
// exactly like the old inline `AsyncGate({...})` call did: `if (gate) return
// gate` for a screen that wants nothing else rendered while loading/erroring
// (GamePage/TeamPage/PlayerPage), or `{gate || <realContent/>}` for a screen
// that wants its own chrome (header, nav) to keep rendering underneath
// (WeekPage — see its own usage). A screen that needs a check BEYOND
// loading/error/empty (PlayerPage's "found the team but not this player on
// its roster") still does that itself, after `gate` comes back null and
// `data` is known-ready.
export function usePageData(loadFn, deps, noun) {
  const back = () => window.history.back()
  const { loading, error, data } = useAsync(loadFn, deps)
  const gate = AsyncGate({ loading, error, data, noun, onBack: back })
  return { data, gate, back }
}
