import { describe, expect, it } from 'vitest'
import {
  canAdvance,
  canRetreat,
  clampCount,
  nextCount,
  parseStoredCount,
  prevCount,
  storageKeyFor,
} from './playCursor.js'

describe('clampCount', () => {
  it('clamps into [0, total]', () => {
    expect(clampCount(5, 10)).toBe(5)
    expect(clampCount(-3, 10)).toBe(0)
    expect(clampCount(15, 10)).toBe(10)
  })

  it('treats non-finite input as 0 rather than clamping it to total', () => {
    expect(clampCount(NaN, 10)).toBe(0)
    expect(clampCount(Infinity, 10)).toBe(0)
  })
})

describe('parseStoredCount', () => {
  const total = 150

  it('parses a valid stored count', () => {
    expect(parseStoredCount('42', total)).toBe(42)
  })

  it('resets to 0 for null/missing storage (never read before)', () => {
    expect(parseStoredCount(null, total)).toBe(0)
  })

  it('resets to 0 for garbage/foreign values rather than throwing', () => {
    expect(parseStoredCount('not-a-number', total)).toBe(0)
    expect(parseStoredCount('', total)).toBe(0)
    expect(parseStoredCount(undefined, total)).toBe(0)
  })

  it('resets to 0 for a negative stored count', () => {
    expect(parseStoredCount('-1', total)).toBe(0)
  })

  it('clamps a stored count from a longer game (e.g. an old cursor for a game that had OT) to the current total', () => {
    expect(parseStoredCount('999', total)).toBe(total)
  })
})

describe('nextCount / prevCount', () => {
  it('nextCount steps by exactly one play', () => {
    expect(nextCount(3, 10)).toBe(4)
  })

  it('nextCount never exceeds total — this is the whole OT-gate simplification usePlayCursor relies on', () => {
    expect(nextCount(10, 10)).toBe(10)
  })

  it('prevCount steps back by exactly one play', () => {
    expect(prevCount(3, 10)).toBe(2)
  })

  it('prevCount never goes below 0', () => {
    expect(prevCount(0, 10)).toBe(0)
  })
})

describe('canAdvance / canRetreat', () => {
  it('canAdvance is false only once every play is revealed', () => {
    expect(canAdvance(9, 10)).toBe(true)
    expect(canAdvance(10, 10)).toBe(false)
  })

  it('canRetreat is false only at the start', () => {
    expect(canRetreat(0)).toBe(false)
    expect(canRetreat(1)).toBe(true)
  })
})

describe('storageKeyFor', () => {
  it('namespaces by game id so two games never share a cursor', () => {
    expect(storageKeyFor('401772830')).toBe('tally-nfl:playCursor:401772830')
    expect(storageKeyFor('401772830')).not.toBe(storageKeyFor('401772834'))
  })
})
