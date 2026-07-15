import { useCallback, useEffect, useRef, useState } from 'react'

// Minimal data-fetching hook: runs `fn` on mount / when `deps` change, tracks
// loading + error, and exposes a `reload` for manual refresh. Ported from
// bbsbh/src/hooks/useAsync.js (sport-agnostic as written).
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({
    loading: true,
    error: null,
    data: null,
  })
  // Out-of-order guard: each run claims a fresh token, and only the holder of
  // the CURRENT token may commit state. Without it, a slow request left in
  // flight across a deps change (navigating week to week, team to team)
  // could resolve after its replacement and clobber the newer data — or
  // paint a stale error over a perfectly fresh result. Bumping the token in
  // the effect cleanup also covers unmount, so no separate mounted ref.
  const runId = useRef(0)
  const abortController = useRef(null)

  const run = useCallback(() => {
    const id = ++runId.current
    abortController.current?.abort()
    const controller = new AbortController()
    abortController.current = controller
    setState((s) => ({ ...s, loading: true, error: null }))
    Promise.resolve()
      .then(() => fn(controller.signal))
      .then((data) => {
        if (runId.current === id) setState({ loading: false, error: null, data })
      })
      .catch((error) => {
        // Keep the last-good data on failure (stale-while-revalidate) rather
        // than wiping an already-loaded screen on a transient refetch error.
        if (runId.current === id)
          setState((s) => ({ loading: false, error, data: s.data }))
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    // Deps changed: the previous deps' data describes a different thing (a
    // different week's slate, a different team) — drop it so it can't render
    // under the new deps' header while the new request is in flight. `reload`
    // (the same `run`, same deps) deliberately skips this reset.
    setState((s) => (s.data === null && s.error === null ? s : { loading: true, error: null, data: null }))
    run()
    return () => {
      // Deliberately the LIVE counter, not a snapshot — bumping it is what
      // invalidates the in-flight request.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      runId.current++
      abortController.current?.abort()
      abortController.current = null
    }
  }, [run])

  return { ...state, reload: run }
}
