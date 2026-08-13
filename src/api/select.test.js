import { describe, expect, it } from 'vitest'
import { selectMatchup, selectPlayList, selectTeamIdentity } from './select.js'

// Minimal shapes mirroring what ADR-0001 verified live against ESPN's
// summary endpoint (event 401772830, TB @ ATL) — just enough fields for
// these selectors, not a full fixture dump.
const summary = {
  header: {
    competitions: [
      {
        status: { type: { detail: 'Final', state: 'post', completed: true } },
        competitors: [
          { homeAway: 'home', team: { id: '1', abbreviation: 'ATL', displayName: 'Atlanta Falcons', logos: [{ href: 'atl.png' }] } },
          { homeAway: 'away', team: { id: '2', abbreviation: 'TB', displayName: 'Tampa Bay Buccaneers', logos: [{ href: 'tb.png' }] } },
        ],
      },
    ],
  },
  drives: {
    previous: [
      {
        team: { id: '1', abbreviation: 'ATL', displayName: 'Atlanta Falcons', logos: [{ href: 'atl.png' }] },
        plays: [
          {
            text: 'C.McLaughlin kicks 59 yards from TB 35 to ATL 6.',
            type: { text: 'Kickoff' },
            scoringPlay: false,
            awayScore: 0,
            homeScore: 0,
            period: { number: 1 },
            clock: { displayValue: '15:00' },
            start: { shortDownDistanceText: '', possessionText: 'ATL 35' },
          },
          {
            text: '(Shotgun) M.Penix pass short right to B.Robinson for 50 yards, TOUCHDOWN.',
            type: { text: 'Passing Touchdown' },
            scoringPlay: true,
            awayScore: 0,
            homeScore: 7,
            period: { number: 1 },
            clock: { displayValue: '13:14' },
            start: { shortDownDistanceText: '2nd & 6', possessionText: 'ATL 50' },
          },
        ],
      },
    ],
  },
}

// A scoreboard event has the same competitors/status shape one level
// shallower (no `.header` wrapper) — verified live per select.js's own
// competitionOf comment.
const scoreboardEvent = {
  competitions: [
    {
      status: { type: { detail: 'Wed, Sep 9th 8:20 PM', state: 'pre', completed: false } },
      competitors: [
        { homeAway: 'home', team: { id: '5', abbreviation: 'SEA', displayName: 'Seattle Seahawks', logo: 'sea.png' } },
        { homeAway: 'away', team: { id: '6', abbreviation: 'NE', displayName: 'New England Patriots', logo: 'ne.png' } },
      ],
    },
  ],
}

describe('selectMatchup', () => {
  it('reads home/away identity and status from a full game-summary shape', () => {
    const m = selectMatchup(summary)
    expect(m.home.abbr).toBe('ATL')
    expect(m.away.abbr).toBe('TB')
    expect(m.statusDetail).toBe('Final')
    expect(m.state).toBe('post')
    expect(m.completed).toBe(true)
  })

  it('reads the same shape from a scoreboard event (no .header wrapper)', () => {
    const m = selectMatchup(scoreboardEvent)
    expect(m.home.abbr).toBe('SEA')
    expect(m.away.abbr).toBe('NE')
    expect(m.state).toBe('pre')
    expect(m.completed).toBe(false)
  })

  it('never carries a score field — that is score.js/selectFinalScore\'s job, not this one\'s', () => {
    const m = selectMatchup(summary)
    expect(m).not.toHaveProperty('score')
    expect(m.home).not.toHaveProperty('score')
    expect(m.away).not.toHaveProperty('score')
  })

  it('degrades to nulls/empty strings for a missing/malformed payload rather than throwing', () => {
    expect(selectMatchup(null)).toEqual({ home: null, away: null, statusDetail: '', state: '', completed: false })
    expect(selectMatchup({})).toEqual({ home: null, away: null, statusDetail: '', state: '', completed: false })
  })
})

describe('selectTeamIdentity', () => {
  it('reads a singular `logo` (scoreboard event shape)', () => {
    expect(selectTeamIdentity({ id: '5', abbreviation: 'SEA', displayName: 'Seattle Seahawks', logo: 'sea.png' }).logo).toBe(
      'sea.png',
    )
  })

  it('falls back to `logos[0].href` (game-summary shape)', () => {
    expect(
      selectTeamIdentity({ id: '1', abbreviation: 'ATL', displayName: 'Atlanta Falcons', logos: [{ href: 'atl.png' }] }).logo,
    ).toBe('atl.png')
  })

  it('returns null for a missing team rather than throwing', () => {
    expect(selectTeamIdentity(null)).toBeNull()
  })
})

describe('selectPlayList', () => {
  const plays = selectPlayList(summary)

  it('flattens drives.previous[].plays[] in chronological order', () => {
    expect(plays).toHaveLength(2)
    expect(plays[0].clock).toBe('15:00')
    expect(plays[1].clock).toBe('13:14')
  })

  it('carries only spoiler-free fields — no text, type, scoringPlay, or score, even for a scoring play', () => {
    for (const play of plays) {
      expect(play).not.toHaveProperty('text')
      expect(play).not.toHaveProperty('type')
      expect(play).not.toHaveProperty('scoringPlay')
      expect(play).not.toHaveProperty('awayScore')
      expect(play).not.toHaveProperty('homeScore')
    }
  })

  it('does carry down/distance/clock/period/possession — the non-scoring detail ADR-0001 keeps eager', () => {
    expect(plays[1]).toEqual({
      period: 1,
      clock: '13:14',
      downDistance: '2nd & 6',
      possession: 'ATL 50',
      driveTeam: { id: '1', abbr: 'ATL', name: 'Atlanta Falcons', logo: 'atl.png' },
    })
  })

  it('returns an empty list for a payload with no drives (e.g. a scoreboard event)', () => {
    expect(selectPlayList(scoreboardEvent)).toEqual([])
    expect(selectPlayList(null)).toEqual([])
  })
})
