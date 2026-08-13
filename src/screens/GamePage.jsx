import { fetchGameSummary } from '../api/game.js'
import { selectMatchup, selectPlayList } from '../api/select.js'
import { selectPlayReveal } from '../api/score.js'
import { usePageData } from '../hooks/usePageData.js'
import { usePlayCursor } from '../hooks/usePlayCursor.js'
import { TeamLogo } from '../components/TeamLogo.jsx'
import { BackBtn } from '../components/BackBtn.jsx'
import { SectionTitle } from '../components/SectionTitle.jsx'
import { SealBox } from '../components/SealBox.jsx'

// The game detail screen — the first place the ADR-0001/0003 play-level
// reveal cursor actually runs, replacing WeekPage/TeamPage's coarser
// whole-game SealBox with a real play-by-play stepper. See src/CLAUDE.md's
// "Reveal granularity" section for the design this implements.
export function GamePage({ id }) {
  const { data, gate, back } = usePageData(() => fetchGameSummary(id), [id], 'game')
  if (gate) return gate

  const summary = data
  const matchup = selectMatchup(summary)
  // Spoiler-free by construction (select.js) — safe to call up front, and
  // its LENGTH is the play-cursor's ceiling. The list itself is never
  // rendered as a jump target (ADR-0003 rejected that navigator shape);
  // it's read positionally, one index at a time, by the stepper below.
  const plays = selectPlayList(summary)

  return (
    <div className="screen game paper-grid">
      <BackBtn onClick={back} />

      <header className="game-hub__id">
        <TeamLogo src={matchup.away?.logo} name={matchup.away?.name} size={40} />
        <div className="game-hub__vs">
          <span className="t-label">{matchup.away?.abbr ?? '—'}</span>
          <span className="game-hub__at">@</span>
          <span className="t-label">{matchup.home?.abbr ?? '—'}</span>
        </div>
        <TeamLogo src={matchup.home?.logo} name={matchup.home?.name} size={40} />
      </header>
      <p className="t-label game-hub__status">{matchup.statusDetail}</p>

      {matchup.state === 'pre' ? (
        <p className="game-hub__prekick">Kickoff hasn’t happened yet — check back once the game starts.</p>
      ) : plays.length === 0 ? (
        <p className="game-hub__prekick">No play-by-play available for this game yet.</p>
      ) : (
        <PlayByPlay gameId={id} summary={summary} plays={plays} matchup={matchup} />
      )}
    </div>
  )
}

function PlayByPlay({ gameId, summary, plays, matchup }) {
  const cursor = usePlayCursor(gameId, plays.length)

  // Score as of the last revealed play — reveal-only data, but only ever
  // read for an index strictly below the cursor (a play the viewer has
  // already tapped through), the same "already revealed, safe outside a
  // SealBox" gating the log rows below use. 0-0 before anything's revealed
  // isn't a spoiler; it's the game's known starting state.
  const currentScore =
    cursor.revealedCount > 0 ? selectPlayReveal(summary, cursor.revealedCount - 1) : { awayScore: 0, homeScore: 0 }

  return (
    <>
      <div className="game-score t-num">
        <span>{matchup.away?.abbr}</span> {currentScore.awayScore}–{currentScore.homeScore}{' '}
        <span>{matchup.home?.abbr}</span>
      </div>

      <SectionTitle title="Play by play" />

      <ol className="playlog">
        {plays.slice(0, cursor.revealedCount).map((play, i) => (
          <RevealedPlay key={i} play={play} reveal={selectPlayReveal(summary, i)} />
        ))}
      </ol>

      <div className="playstepper">
        <button type="button" className="playstepper__btn" onClick={cursor.retreat} disabled={!cursor.canRetreat}>
          ‹ Prev play
        </button>
        {cursor.canAdvance ? (
          <SealBox
            key={cursor.revealedCount}
            compact
            onReveal={cursor.advance}
            label={nextPlayLabel(plays[cursor.revealedCount])}
          >
            {() => {
              const reveal = selectPlayReveal(summary, cursor.revealedCount)
              return <RevealedPlay play={plays[cursor.revealedCount]} reveal={reveal} />
            }}
          </SealBox>
        ) : (
          <p className="playstepper__done t-label">All plays revealed</p>
        )}
      </div>
    </>
  )
}

function nextPlayLabel(play) {
  if (!play) return 'Tap to reveal the next play'
  const bits = [play.downDistance, play.possession].filter(Boolean).join(' at ')
  return bits ? `Tap to reveal the next play — ${bits}` : 'Tap to reveal the next play'
}

function RevealedPlay({ play, reveal }) {
  const meta = [play?.driveTeam?.abbr, play?.period && `Q${play.period} ${play.clock}`, play?.downDistance]
    .filter(Boolean)
    .join(' · ')
  return (
    <li className={`playrow${reveal?.scoringPlay ? ' playrow--score' : ''}`}>
      <div className="playrow__meta t-label">{meta}</div>
      <p className="playrow__text">{reveal?.text}</p>
      <div className="t-num playrow__score">
        {reveal?.awayScore}–{reveal?.homeScore}
      </div>
    </li>
  )
}
