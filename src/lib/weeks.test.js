import { describe, expect, it } from 'vitest'
import { SEASON_TYPE, SEASON_WEEKS, seasonTypeLabel, weekAt, weekIndex, weekLabel } from './weeks.js'

describe('SEASON_WEEKS', () => {
  it('has the documented preseason/regular/postseason counts (4 + 18 + 5)', () => {
    expect(SEASON_WEEKS.filter((w) => w.seasonType === SEASON_TYPE.PRESEASON)).toHaveLength(4)
    expect(SEASON_WEEKS.filter((w) => w.seasonType === SEASON_TYPE.REGULAR)).toHaveLength(18)
    expect(SEASON_WEEKS.filter((w) => w.seasonType === SEASON_TYPE.POSTSEASON)).toHaveLength(5)
  })

  it('labels postseason week 4 as the Pro Bowl, not a playoff round', () => {
    const w = SEASON_WEEKS.find((x) => x.seasonType === SEASON_TYPE.POSTSEASON && x.week === 4)
    expect(w.label).toBe('Pro Bowl')
  })

  it('labels preseason week 1 as the Hall of Fame Game, not "Preseason Week 1"', () => {
    const w = SEASON_WEEKS.find((x) => x.seasonType === SEASON_TYPE.PRESEASON && x.week === 1)
    expect(w.label).toBe('Hall of Fame Weekend')
  })
})

describe('weekIndex / weekAt', () => {
  it('round-trips a known week', () => {
    const i = weekIndex(SEASON_TYPE.REGULAR, 1)
    expect(weekAt(i)).toEqual({ seasonType: SEASON_TYPE.REGULAR, week: 1, label: 'Week 1' })
  })

  it('falls back to regular-season week 1 for an unknown seasonType/week pair', () => {
    const fallbackIndex = weekIndex(SEASON_TYPE.REGULAR, 1)
    expect(weekIndex(99, 99)).toBe(fallbackIndex)
  })

  it('clamps weekAt to the list bounds instead of returning undefined', () => {
    expect(weekAt(-5)).toEqual(SEASON_WEEKS[0])
    expect(weekAt(SEASON_WEEKS.length + 5)).toEqual(SEASON_WEEKS[SEASON_WEEKS.length - 1])
  })
})

describe('weekLabel', () => {
  it('returns the known label', () => {
    expect(weekLabel(SEASON_TYPE.POSTSEASON, 5)).toBe('Super Bowl')
  })

  it('falls back to "Week N" for an unrecognized pair rather than throwing', () => {
    expect(weekLabel(99, 7)).toBe('Week 7')
  })
})

describe('seasonTypeLabel', () => {
  it('maps all three season types', () => {
    expect(seasonTypeLabel(SEASON_TYPE.PRESEASON)).toBe('Preseason')
    expect(seasonTypeLabel(SEASON_TYPE.REGULAR)).toBe('Regular Season')
    expect(seasonTypeLabel(SEASON_TYPE.POSTSEASON)).toBe('Postseason')
  })
})
