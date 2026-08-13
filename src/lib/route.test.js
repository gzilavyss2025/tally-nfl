import { describe, expect, it } from 'vitest'
import { gamePath, parseRoute, playerPath, routeRemountsOnNavigate, teamPath, weekPath } from './route.js'

describe('parseRoute', () => {
  it('parses the week route, coercing seasonType/week to numbers and injecting the fixed season', () => {
    expect(parseRoute('/week/2/5')).toEqual({ name: 'week', seasonType: 2, week: 5, season: 2025 })
  })

  it('parses the game route', () => {
    expect(parseRoute('/game/401772830')).toEqual({ name: 'game', id: '401772830' })
  })

  it('parses the team route', () => {
    expect(parseRoute('/team/21')).toEqual({ name: 'team', id: '21' })
  })

  it('parses the player route', () => {
    expect(parseRoute('/player/21/3929630')).toEqual({ name: 'player', teamId: '21', id: '3929630' })
  })

  it('ignores a query string', () => {
    expect(parseRoute('/team/21?utm_source=x')).toEqual({ name: 'team', id: '21' })
  })

  it('falls back to the default week route for an unrecognized path', () => {
    const fallback = { name: 'week', seasonType: 2, week: 1, season: 2025 }
    expect(parseRoute('/nonsense')).toEqual(fallback)
    expect(parseRoute('/')).toEqual(fallback)
    expect(parseRoute('')).toEqual(fallback)
    expect(parseRoute('/team/21/extra/segment')).toEqual(fallback)
  })
})

describe('path builders round-trip parseRoute', () => {
  it('weekPath', () => {
    expect(parseRoute(weekPath(3, 2))).toEqual({ name: 'week', seasonType: 3, week: 2, season: 2025 })
  })

  it('gamePath', () => {
    expect(parseRoute(gamePath('401772830'))).toEqual({ name: 'game', id: '401772830' })
  })

  it('teamPath', () => {
    expect(parseRoute(teamPath('21'))).toEqual({ name: 'team', id: '21' })
  })

  it('playerPath', () => {
    expect(parseRoute(playerPath('21', '3929630'))).toEqual({ name: 'player', teamId: '21', id: '3929630' })
  })
})

describe('routeRemountsOnNavigate', () => {
  it('is true only for game (GamePage owns per-instance play-cursor state)', () => {
    expect(routeRemountsOnNavigate('game')).toBe(true)
    expect(routeRemountsOnNavigate('week')).toBe(false)
    expect(routeRemountsOnNavigate('team')).toBe(false)
    expect(routeRemountsOnNavigate('player')).toBe(false)
  })

  it('is false for an unknown route name rather than throwing', () => {
    expect(routeRemountsOnNavigate('nonsense')).toBe(false)
  })
})
