// Shared low-level fetch wrapper for ESPN's undocumented NFL JSON API — every
// topic file in api/ calls this for its own endpoints (mirrors bbsbh's
// api/statsapi.js: same retry/timeout shape, adapted to ESPN's base URL).
// This is a public, unversioned, no-key API that can change shape without
// notice — every field path a caller reads should be verified against a live
// response before being trusted. See
// docs/adr/0001-drive-is-the-reveal-cursor-sealed-value-is-score-state.md for
// the fields verified so far (checked against event 401772830 — TB @ ATL,
// 2025-09-07, Final — and event 401772834 — NYG @ DAL, 2025-09-14, Final/OT).

const BASE = 'https://site.api.espn.com'
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504])
const DEFAULT_TIMEOUT_MS = 15_000
const DEFAULT_RETRIES = 1

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// `base` defaults to the site.api host every other caller uses; player.js
// overrides it to reach site.web.api.espn.com (the athlete-stats endpoint
// lives on a different ESPN host but wants the same retry/timeout handling —
// see docs/data-sources.md, both hosts confirmed CORS-open 2026-07-15).
export async function getJson(
  path,
  { signal: parentSignal, timeoutMs = DEFAULT_TIMEOUT_MS, retries = DEFAULT_RETRIES, base = BASE } = {},
) {
  for (let attempt = 0; ; attempt += 1) {
    const controller = new AbortController()
    let timedOut = false
    const onAbort = () => controller.abort()
    parentSignal?.addEventListener('abort', onAbort, { once: true })
    if (parentSignal?.aborted) controller.abort()
    const timeout = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, timeoutMs)

    try {
      const res = await fetch(`${base}${path}`, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      })
      if (res.ok) return res.json()

      if (attempt < retries && RETRYABLE_STATUS.has(res.status)) {
        await delay(250 * 2 ** attempt)
        continue
      }
      throw new Error(`ESPN API ${res.status} for ${path}`)
    } catch (error) {
      if (parentSignal?.aborted) throw error
      const failure = timedOut
        ? Object.assign(new Error(`ESPN API timeout for ${path}`), { name: 'TimeoutError' })
        : error
      const retryableError = timedOut || error?.name === 'TypeError'
      if (attempt < retries && retryableError) {
        await delay(250 * 2 ** attempt)
        continue
      }
      throw failure
    } finally {
      clearTimeout(timeout)
      parentSignal?.removeEventListener('abort', onAbort)
    }
  }
}
