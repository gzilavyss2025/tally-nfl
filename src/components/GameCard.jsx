import { SealBox } from './SealBox.jsx'
import { TeamLogo } from './TeamLogo.jsx'
import { TeamLink } from './TeamLink.jsx'
import { GameLink } from './GameLink.jsx'
import { selectMatchup } from '../api/select.js'
import { selectFinalScore } from '../api/score.js'

// One row on the week slate. `event` is a single entry from
// fetchScoreboard's `.events` array (see src/api/scoreboard.js). A game that
// hasn't kicked off yet (state 'pre') has no score to seal — showing a
// SealBox for it would just be a cover over nothing, so it shows the kickoff
// time/status instead. Anything else ('in' or 'post') gets the seal, exactly
// like App.jsx's original single-game demo.
export function GameCard({ event }) {
  const { home, away, statusDetail, state } = selectMatchup(event)

  return (
    <li className="gamecard">
      <div className="gamecard__matchup">
        <TeamRow team={away} />
        <TeamRow team={home} />
      </div>
      <div className="gamecard__side">
        <span className="t-label gamecard__status">{statusDetail}</span>
        {state === 'pre' ? null : (
          <SealBox compact label={`Tap to reveal the ${away?.abbr ?? 'away'} at ${home?.abbr ?? 'home'} score`}>
            {() => {
              const score = selectFinalScore(event)
              return (
                <div className="t-num gamecard__score">
                  {score.away?.score}–{score.home?.score}
                </div>
              )
            }}
          </SealBox>
        )}
        {/* Whole-game seal above is the slate's coarse stand-in (src/CLAUDE.md's
            "Reveal granularity"); this always leads into the real ADR-0001/0003
            play-by-play cursor on GamePage, live or not-yet-started alike. */}
        <GameLink id={event.id} className="gamecard__detail">
          Plays ›
        </GameLink>
      </div>
    </li>
  )
}

function TeamRow({ team }) {
  if (!team) return null
  return (
    <TeamLink id={team.id} className="gamecard__team">
      <TeamLogo src={team.logo} name={team.name} size={26} />
      <span className="gamecard__teamabbr">{team.abbr}</span>
    </TeamLink>
  )
}
