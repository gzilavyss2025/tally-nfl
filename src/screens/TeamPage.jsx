import {
  fetchTeamInfo,
  fetchTeamRoster,
  fetchTeamSchedule,
  selectTeamIdentityFromTeamInfo,
  selectScheduleRow,
} from '../api/team.js'
import { selectWinner, selectFinalScore } from '../api/score.js'
import { deriveTeamRecord } from '../api/derive.js'
import { useAsync } from '../hooks/useAsync.js'
import { weekLabel } from '../lib/weeks.js'
import { TeamLogo } from '../components/TeamLogo.jsx'
import { TeamLink } from '../components/TeamLink.jsx'
import { PlayerLink } from '../components/PlayerLink.jsx'
import { BackBtn } from '../components/BackBtn.jsx'
import { SectionTitle } from '../components/SectionTitle.jsx'
import { AsyncGate } from '../components/AsyncGate.jsx'
import { SealBox } from '../components/SealBox.jsx'

// This screen's own "season" — see route.js's header comment, no season
// picker exists yet.
const SEASON = 2025

const GROUP_ORDER = ['offense', 'defense', 'specialTeam']
const GROUP_TITLES = { offense: 'Offense', defense: 'Defense', specialTeam: 'Special Teams' }

async function loadTeamPage(id) {
  const [teamInfo, roster, scheduleResp] = await Promise.all([
    fetchTeamInfo(id),
    fetchTeamRoster(id),
    fetchTeamSchedule(id, SEASON),
  ])
  return {
    identity: selectTeamIdentityFromTeamInfo(teamInfo),
    roster,
    scheduleEvents: scheduleResp?.events ?? [],
  }
}

export function TeamPage({ id }) {
  const back = () => window.history.back()
  const { loading, error, data } = useAsync(() => loadTeamPage(id), [id])

  const gate = AsyncGate({ loading, error, data, noun: 'team', onBack: back })
  if (gate) return gate

  const { identity, roster, scheduleEvents } = data
  const groups = roster?.athletes ?? []
  const injured = groups.find((g) => g.position === 'injuredReserveOrOut')?.items ?? []
  const suspended = groups.find((g) => g.position === 'suspended')?.items ?? []
  const flagged = [...injured, ...suspended]

  return (
    <div className="screen team-hub paper-grid">
      <BackBtn onClick={back} />

      <header className="team-hub__id">
        <TeamLogo src={identity?.logo} name={identity?.name} size={56} />
        <div>
          <h1 className="team-hub__name">{identity?.name}</h1>
          {/* Record + standing are both a function of every game played so
              far, same spoiler class as a single game's score — see
              docs/adr/0002-season-and-career-aggregates-are-sealed-as-one-block.md.
              deriveTeamRecord (derive.js) is reveal-only, called here only
              because this is inside SealBox's render function. */}
          <SealBox compact label="Tap to reveal record and standing">
            {() => {
              const record = deriveTeamRecord(scheduleEvents, id)
              return (
                <p className="t-num team-hub__record">
                  {record.wins}-{record.losses}
                  {record.ties ? `-${record.ties}` : ''}
                  {identity?.standingSummary && (
                    <span className="team-hub__standing"> · {identity.standingSummary}</span>
                  )}
                </p>
              )
            }}
          </SealBox>
        </div>
      </header>

      {GROUP_ORDER.map((key) => {
        const group = groups.find((g) => g.position === key)
        if (!group || group.items.length === 0) return null
        return (
          <section key={key}>
            <SectionTitle title={GROUP_TITLES[key]} note={`${group.items.length}`} />
            <RosterList teamId={id} players={group.items} />
          </section>
        )
      })}

      {flagged.length > 0 && (
        <section>
          <SectionTitle title="Injured / Suspended" />
          <RosterList teamId={id} players={flagged} />
        </section>
      )}

      <SectionTitle title="Schedule" note={`${SEASON}`} />
      <ul className="schedule-list">
        {scheduleEvents.map((event) => {
          const row = selectScheduleRow(event)
          const isHome = String(row.home?.id) === String(id)
          const opponent = isHome ? row.away : row.home
          return (
            <li key={row.id} className="schedule-row">
              <span className="schedule-row__week">{weekLabel(row.seasonType, row.weekNumber)}</span>
              <span className="schedule-row__opp">
                {isHome ? 'vs' : '@'}{' '}
                <TeamLink id={opponent?.id} className="schedule-row__opplink">
                  {opponent?.abbr}
                </TeamLink>
              </span>
              {row.completed ? (
                <SealBox compact label={`Tap to reveal the result vs ${opponent?.abbr}`}>
                  {() => {
                    const result = selectWinner(event, id)
                    const score = selectFinalScore(event)
                    return (
                      <span className="t-num schedule-row__result">
                        {result} {score.away?.score}-{score.home?.score}
                      </span>
                    )
                  }}
                </SealBox>
              ) : (
                <span className="schedule-row__status t-label">{row.statusDetail}</span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function RosterList({ teamId, players }) {
  return (
    <ul className="roster-list">
      {players.map((p) => (
        <li key={p.id} className="roster-row">
          <span className="roster-row__jersey t-num">{p.jersey ?? ''}</span>
          <PlayerLink teamId={teamId} id={p.id} className="roster-row__name">
            {p.fullName}
          </PlayerLink>
          <span className="roster-row__pos">{p.position?.abbreviation ?? ''}</span>
        </li>
      ))}
    </ul>
  )
}
