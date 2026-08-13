// Pure play-cursor math, split out of hooks/usePlayCursor.js so the actual
// clamping/step logic (the part worth locking down with a unit test) doesn't
// require React or a DOM to exercise. The hook is a thin useState +
// localStorage wrapper around these; nothing here touches storage or React.
//
// See usePlayCursor's own header comment for what the cursor means
// (ADR-0001's play grain, ADR-0003's step-only-no-jump navigation) — this
// file is just the arithmetic that implements it.

export function storageKeyFor(gameId) {
  return `tally-nfl:playCursor:${gameId}`
}

// Clamp any candidate count (from storage, or an advance/retreat) into
// [0, total] — the only invariant the cursor ever needs to hold.
export function clampCount(count, total) {
  if (!Number.isFinite(count) || count < 0) return 0
  return Math.min(count, total)
}

// Parses a raw localStorage string (possibly null/garbage) into a valid
// starting count for `total` plays. Never throws — a corrupt/foreign value
// just resets to 0 rather than breaking the page.
export function parseStoredCount(raw, total) {
  return clampCount(Number(raw), total)
}

export function nextCount(count, total) {
  return clampCount(count + 1, total)
}

export function prevCount(count, total) {
  return clampCount(count - 1, total)
}

export function canAdvance(count, total) {
  return count < total
}

export function canRetreat(count) {
  return count > 0
}
