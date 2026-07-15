import { BackBtn } from './BackBtn.jsx'

// Shared loading/error/empty presentation for a screen's top-level
// useAsync() result — a screen calls this first and returns early on
// whatever it gives back, so the rest of the render body can assume `data`
// is ready (bbsbh's AsyncGate follows the same convention).
export function AsyncGate({ loading, error, data, noun = 'page', onBack }) {
  if (loading && !data) return <p className="t-label">Loading…</p>
  if (error && !data) {
    return (
      <div className="asyncgate__error">
        <p>Couldn’t load this {noun}. Check your connection and try again.</p>
        {onBack && <BackBtn onClick={onBack} />}
      </div>
    )
  }
  if (!data) return <p className="t-label">Nothing here.</p>
  return null
}
