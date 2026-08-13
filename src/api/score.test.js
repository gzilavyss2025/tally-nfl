import { describe, expect, it } from 'vitest'
import { selectFinalScore, selectPlayReveal, selectWinner } from './score.js'

const summary = {
  header: {
    competitions: [
      {
        status: { type: { completed: true } },
        competitors: [
          { homeAway: 'home', team: { id: '1', abbreviation: 'ATL' }, score: '7', winner: true },
          { homeAway: 'away', team: { id: '2', abbreviation: 'TB' }, score: '0', winner: false },
        ],
      },
    ],
  },
  drives: {
    previous: [
      {
        plays: [
          { text: 'Kickoff.', scoringPlay: false, awayScore: 0, homeScore: 0 },
          { text: '...TOUCHDOWN.', scoringPlay: true, awayScore: 0, homeScore: 7 },
        ],
      },
      {
        plays: [{ text: 'Official Timeout.', scoringPlay: false, awayScore: 0, homeScore: 7 }],
      },
    ],
  },
}

describe('selectFinalScore', () => {
  it('reads home/away score as numbers', () => {
    expect(selectFinalScore(summary)).toEqual({
      home: { abbr: 'ATL', score: 7 },
      away: { abbr: 'TB', score: 0 },
    })
  })

  it('degrades to nulls for a missing payload', () => {
    expect(selectFinalScore(null)).toEqual({ home: null, away: null })
  })
})

describe('selectWinner', () => {
  it('returns W/L for the winning/losing team of a completed game', () => {
    expect(selectWinner(summary, '1')).toBe('W')
    expect(selectWinner(summary, '2')).toBe('L')
  })

  it('matches team id as a string/number-agnostic comparison', () => {
    expect(selectWinner(summary, 1)).toBe('W')
  })

  it('returns null for an unfinished game rather than guessing from partial data', () => {
    const inProgress = { header: { competitions: [{ status: { type: { completed: false } }, competitors: summary.header.competitions[0].competitors }] } }
    expect(selectWinner(inProgress, '1')).toBeNull()
  })

  it('returns null for a team not in this game', () => {
    expect(selectWinner(summary, '999')).toBeNull()
  })

  it('returns T when both competitors carry winner:false (a real NFL regular-season tie)', () => {
    const tie = {
      header: {
        competitions: [
          {
            status: { type: { completed: true } },
            competitors: [
              { homeAway: 'home', team: { id: '1' }, winner: false },
              { homeAway: 'away', team: { id: '2' }, winner: false },
            ],
          },
        ],
      },
    }
    expect(selectWinner(tie, '1')).toBe('T')
    expect(selectWinner(tie, '2')).toBe('T')
  })
})

describe('selectPlayReveal', () => {
  it('flattens drives.previous[].plays[] in chronological order, across drive boundaries', () => {
    expect(selectPlayReveal(summary, 0).text).toBe('Kickoff.')
    expect(selectPlayReveal(summary, 1).text).toBe('...TOUCHDOWN.')
    expect(selectPlayReveal(summary, 2).text).toBe('Official Timeout.') // 2nd drive, 1st play
  })

  it('carries the score AS OF that specific play, not the final score', () => {
    expect(selectPlayReveal(summary, 0)).toEqual({ text: 'Kickoff.', scoringPlay: false, awayScore: 0, homeScore: 0 })
    expect(selectPlayReveal(summary, 1)).toEqual({
      text: '...TOUCHDOWN.',
      scoringPlay: true,
      awayScore: 0,
      homeScore: 7,
    })
  })

  it('returns null for an out-of-range index rather than throwing', () => {
    expect(selectPlayReveal(summary, 99)).toBeNull()
    expect(selectPlayReveal(summary, -1)).toBeNull()
  })

  it('returns null for a payload with no drives', () => {
    expect(selectPlayReveal({}, 0)).toBeNull()
  })
})
