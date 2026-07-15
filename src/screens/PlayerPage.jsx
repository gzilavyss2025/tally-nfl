import { fetchTeamRoster } from '../api/team.js'
import { fetchAthleteSeasonStats, selectPlayerBio } from '../api/player.js'
import { selectTeamIdentity } from '../api/select.js'
import { selectCareerStats } from '../api/derive.js'
import { useAsync } from '../hooks/useAsync.js'
import { TeamLink } from '../components/TeamLink.jsx'
import { BackBtn } from '../components/BackBtn.jsx'
import { SectionTitle } from '../components/SectionTitle.jsx'
import { AsyncGate } from '../components/AsyncGate.jsx'
import { SealBox } from '../components/SealBox.jsx'

const DASH = '—'

// Player bio comes from the SAME team-roster fetch TeamPage already uses
// (see player.js's header comment on why there's no standalone athlete-by-id
// lookup); stats are a second, independent fetch. Both are safe to run
// eagerly — see fetchAthleteSeasonStats' own comment — only the SELECTED,
// shaped stats are reveal-only.
async function loadPlayerPage(teamId, playerId) {
  const [roster, statsPayload] = await Promise.all([
    fetchTeamRoster(teamId),
    fetchAthleteSeasonStats(playerId),
  ])
  return {
    bio: selectPlayerBio(roster, playerId),
    // The roster response's own top-level `team` (name/logo for the header's
    // team link) — reuses select.js's selectTeamIdentity rather than
    // reshaping it a third way.
    team: selectTeamIdentity(roster?.team),
    statsPayload,
  }
}

export function PlayerPage({ teamId, id }) {
  const back = () => window.history.back()
  const { loading, error, data } = useAsync(() => loadPlayerPage(teamId, id), [teamId, id])

  const gate = AsyncGate({ loading, error, data, noun: 'player', onBack: back })
  if (gate) return gate

  const { bio, team, statsPayload } = data
  if (!bio) {
    return (
      <div className="screen player paper-grid">
        <BackBtn onClick={back} />
        <p>Couldn’t find that player on this team’s roster.</p>
      </div>
    )
  }

  return (
    <div className="screen player paper-grid">
      <BackBtn onClick={back} />

      <header className="player-hero">
        {bio.headshot ? (
          <img className="player-hero__shot" src={bio.headshot} alt="" />
        ) : (
          <div className="player-hero__shot player-hero__shot--empty" aria-hidden="true" />
        )}
        <div className="player-hero__id">
          <h1 className="player-hero__name">
            {bio.name}
            {bio.jersey && <span className="player-hero__num">#{bio.jersey}</span>}
          </h1>
          <p className="player-hero__meta">
            {bio.positionAbbr && <span>{bio.positionAbbr}</span>}
            <TeamLink id={team?.id} className="player-hero__team">
              {team?.name ?? 'Team'}
            </TeamLink>
          </p>
        </div>
      </header>

      {/* Bio facts — height/weight/age/college/experience/status are never
          score-relevant, so these render eagerly, no SealBox. */}
      <div className="factgrid">
        <Fact label="Ht / Wt" value={bio.heightWeight || DASH} />
        <Fact label="Age" value={bio.age ?? DASH} mono />
        <Fact label="College" value={bio.college || DASH} />
        <Fact label="Experience" value={bio.experienceYears != null ? `${bio.experienceYears} yrs` : DASH} />
        <Fact label="Status" value={bio.status || DASH} />
      </div>

      {/* Season and career totals are a function of every game the player's
          played, including any the viewer hasn't watched yet — same
          spoiler class as TeamPage's record, sealed as one block for the
          same reason. See
          docs/adr/0002-season-and-career-aggregates-are-sealed-as-one-block.md.
          selectCareerStats (derive.js) is reveal-only, called here only
          because this is inside SealBox's render function. */}
      <SealBox label="Tap to reveal season and career stats">
        {() => {
          const categories = selectCareerStats(statsPayload)
          if (categories.length === 0) return <p>No stats on record.</p>
          return (
            <>
              {categories.map((cat) => (
                <StatTable key={cat.key} category={cat} />
              ))}
            </>
          )
        }}
      </SealBox>
    </div>
  )
}

function Fact({ label, value, mono = false }) {
  return (
    <div className="fact">
      <div className="fact__label t-label">{label}</div>
      <div className={mono ? 't-num' : 'fact__value'}>{value}</div>
    </div>
  )
}

function StatTable({ category }) {
  return (
    <section className="stattable">
      <SectionTitle title={category.title} />
      <div className="ledger-wrap">
        <table className="ledger">
          <thead>
            <tr>
              <th className="lft">Year</th>
              {category.labels.map((label, i) => (
                // Keyed by position, not the label text: ESPN's own
                // "defensive" category repeats "YDS" for two different
                // columns (fumble-return yards and interception-return
                // yards both carry that label) — confirmed live 2026-07-15
                // against athlete 3115922 — so the label alone isn't a
                // unique key.
                <th key={i}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Keyed by position, not `row.year` alone: a player traded
                mid-season carries two rows for the same year (one per
                team), same reasoning as the header row's key above. */}
            {category.seasons.map((row, i) => (
              <tr key={i}>
                <td className="lft t-num">{row.year}</td>
                {row.values.map((v, i) => (
                  <td key={i} className="t-num">{v}</td>
                ))}
              </tr>
            ))}
          </tbody>
          {category.totals.length > 0 && (
            <tfoot>
              <tr>
                <td className="lft">Career</td>
                {category.totals.map((v, i) => (
                  <td key={i} className="t-num">{v}</td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </section>
  )
}
