// Hand-verified team-identity crosswalk — the "master key" for joining ESPN,
// nflverse, and Sleeper data by team. None of the three sources publishes
// this mapping itself, and none of them agree on abbreviations for all 32
// teams, so this has to be maintained here rather than derived. See
// docs/data-sources.md for the full join model this table anchors.
//
// Verified live 2026-07-15 against:
//   - ESPN:     GET /apis/site/v2/sports/football/nfl/teams?limit=40, plus
//               historical `summary` responses for relocated franchises
//               (event 400791585/400791558/400791550 — 2015 OAK/SD/STL games)
//   - nflverse: public/data/nflverse-games.json, full season-by-season
//               away_team/home_team history, 1999-2026
//   - Sleeper:  GET /v1/players/nfl (team_abbr field, distinct values)
//
// Current-abbreviation mismatches — only two teams disagree, everything
// else uses the same abbreviation everywhere:
//   - Washington: ESPN "WSH"  vs nflverse/Sleeper "WAS"
//   - LA Rams:    ESPN/Sleeper "LAR" vs nflverse "LA"
//
// Relocated franchises — three teams changed abbreviation mid-history within
// the range nflverse's data actually covers (1999+), so a lookup against an
// old game is a real, common case here, not just a hypothetical:
//   - Raiders:   OAK 1999-2019 -> LV 2020+   (nflverse AND ESPN both used OAK)
//   - Chargers:  SD  1999-2016 -> LAC 2017+  (nflverse AND ESPN both used SD)
//   - Rams:      STL 1999-2015 -> LA  2016+  (nflverse AND ESPN both used STL)
// Confirmed via ESPN's own historical `summary` responses: old games return
// the period-correct abbreviation (e.g. "OAK"), but the team's numeric
// `id` is stable across the move (Raiders are always espnId 13) — so id is
// the real anchor, abbreviation is just an era-specific display string.
// `*AbbrHistory` below lists every abbreviation a source has used for that
// franchise; the lookup helpers check current AND history.
//
// The Raiders' earlier LA stint (1982-1994) predates nflverse's dataset
// (starts 1999) entirely, so there's no "LA" collision with the Rams'
// current nflverse abbreviation to worry about — but also no data to
// resolve an even-older LA-Raiders lookup against; not built, nothing
// in this app's data range needs it.
//
// Sleeper's live snapshot (scanned in full, 2026-07-15) only contains
// legacy team_abbr "OAK" among these three — no "SD" or "STL" appear at
// all, presumably because Sleeper's player pool skews toward fantasy
// relevance and nobody who last played for St. Louis (pre-2016) or San
// Diego (pre-2017) is still in it. sleeperAbbrHistory still lists them for
// correctness/symmetry; those lookups just won't currently hit.
export const TEAMS = [
  { espnId: '22', espnAbbr: 'ARI', nflverseAbbr: 'ARI', sleeperAbbr: 'ARI', name: 'Arizona Cardinals', slug: 'arizona-cardinals' },
  { espnId: '1', espnAbbr: 'ATL', nflverseAbbr: 'ATL', sleeperAbbr: 'ATL', name: 'Atlanta Falcons', slug: 'atlanta-falcons' },
  { espnId: '33', espnAbbr: 'BAL', nflverseAbbr: 'BAL', sleeperAbbr: 'BAL', name: 'Baltimore Ravens', slug: 'baltimore-ravens' },
  { espnId: '2', espnAbbr: 'BUF', nflverseAbbr: 'BUF', sleeperAbbr: 'BUF', name: 'Buffalo Bills', slug: 'buffalo-bills' },
  { espnId: '29', espnAbbr: 'CAR', nflverseAbbr: 'CAR', sleeperAbbr: 'CAR', name: 'Carolina Panthers', slug: 'carolina-panthers' },
  { espnId: '3', espnAbbr: 'CHI', nflverseAbbr: 'CHI', sleeperAbbr: 'CHI', name: 'Chicago Bears', slug: 'chicago-bears' },
  { espnId: '4', espnAbbr: 'CIN', nflverseAbbr: 'CIN', sleeperAbbr: 'CIN', name: 'Cincinnati Bengals', slug: 'cincinnati-bengals' },
  { espnId: '5', espnAbbr: 'CLE', nflverseAbbr: 'CLE', sleeperAbbr: 'CLE', name: 'Cleveland Browns', slug: 'cleveland-browns' },
  { espnId: '6', espnAbbr: 'DAL', nflverseAbbr: 'DAL', sleeperAbbr: 'DAL', name: 'Dallas Cowboys', slug: 'dallas-cowboys' },
  { espnId: '7', espnAbbr: 'DEN', nflverseAbbr: 'DEN', sleeperAbbr: 'DEN', name: 'Denver Broncos', slug: 'denver-broncos' },
  { espnId: '8', espnAbbr: 'DET', nflverseAbbr: 'DET', sleeperAbbr: 'DET', name: 'Detroit Lions', slug: 'detroit-lions' },
  { espnId: '9', espnAbbr: 'GB', nflverseAbbr: 'GB', sleeperAbbr: 'GB', name: 'Green Bay Packers', slug: 'green-bay-packers' },
  { espnId: '34', espnAbbr: 'HOU', nflverseAbbr: 'HOU', sleeperAbbr: 'HOU', name: 'Houston Texans', slug: 'houston-texans' },
  { espnId: '11', espnAbbr: 'IND', nflverseAbbr: 'IND', sleeperAbbr: 'IND', name: 'Indianapolis Colts', slug: 'indianapolis-colts' },
  { espnId: '30', espnAbbr: 'JAX', nflverseAbbr: 'JAX', sleeperAbbr: 'JAX', name: 'Jacksonville Jaguars', slug: 'jacksonville-jaguars' },
  { espnId: '12', espnAbbr: 'KC', nflverseAbbr: 'KC', sleeperAbbr: 'KC', name: 'Kansas City Chiefs', slug: 'kansas-city-chiefs' },
  {
    espnId: '13',
    espnAbbr: 'LV',
    espnAbbrHistory: ['OAK'],
    nflverseAbbr: 'LV',
    nflverseAbbrHistory: ['OAK'],
    sleeperAbbr: 'LV',
    sleeperAbbrHistory: ['OAK'],
    name: 'Las Vegas Raiders',
    slug: 'las-vegas-raiders',
  },
  {
    espnId: '24',
    espnAbbr: 'LAC',
    espnAbbrHistory: ['SD'],
    nflverseAbbr: 'LAC',
    nflverseAbbrHistory: ['SD'],
    sleeperAbbr: 'LAC',
    sleeperAbbrHistory: ['SD'],
    name: 'Los Angeles Chargers',
    slug: 'los-angeles-chargers',
  },
  {
    espnId: '14',
    espnAbbr: 'LAR',
    espnAbbrHistory: ['STL'],
    nflverseAbbr: 'LA',
    nflverseAbbrHistory: ['STL'],
    sleeperAbbr: 'LAR',
    sleeperAbbrHistory: ['STL'],
    name: 'Los Angeles Rams',
    slug: 'los-angeles-rams',
  },
  { espnId: '15', espnAbbr: 'MIA', nflverseAbbr: 'MIA', sleeperAbbr: 'MIA', name: 'Miami Dolphins', slug: 'miami-dolphins' },
  { espnId: '16', espnAbbr: 'MIN', nflverseAbbr: 'MIN', sleeperAbbr: 'MIN', name: 'Minnesota Vikings', slug: 'minnesota-vikings' },
  { espnId: '17', espnAbbr: 'NE', nflverseAbbr: 'NE', sleeperAbbr: 'NE', name: 'New England Patriots', slug: 'new-england-patriots' },
  { espnId: '18', espnAbbr: 'NO', nflverseAbbr: 'NO', sleeperAbbr: 'NO', name: 'New Orleans Saints', slug: 'new-orleans-saints' },
  { espnId: '19', espnAbbr: 'NYG', nflverseAbbr: 'NYG', sleeperAbbr: 'NYG', name: 'New York Giants', slug: 'new-york-giants' },
  { espnId: '20', espnAbbr: 'NYJ', nflverseAbbr: 'NYJ', sleeperAbbr: 'NYJ', name: 'New York Jets', slug: 'new-york-jets' },
  { espnId: '21', espnAbbr: 'PHI', nflverseAbbr: 'PHI', sleeperAbbr: 'PHI', name: 'Philadelphia Eagles', slug: 'philadelphia-eagles' },
  { espnId: '23', espnAbbr: 'PIT', nflverseAbbr: 'PIT', sleeperAbbr: 'PIT', name: 'Pittsburgh Steelers', slug: 'pittsburgh-steelers' },
  { espnId: '25', espnAbbr: 'SF', nflverseAbbr: 'SF', sleeperAbbr: 'SF', name: 'San Francisco 49ers', slug: 'san-francisco-49ers' },
  { espnId: '26', espnAbbr: 'SEA', nflverseAbbr: 'SEA', sleeperAbbr: 'SEA', name: 'Seattle Seahawks', slug: 'seattle-seahawks' },
  { espnId: '27', espnAbbr: 'TB', nflverseAbbr: 'TB', sleeperAbbr: 'TB', name: 'Tampa Bay Buccaneers', slug: 'tampa-bay-buccaneers' },
  { espnId: '10', espnAbbr: 'TEN', nflverseAbbr: 'TEN', sleeperAbbr: 'TEN', name: 'Tennessee Titans', slug: 'tennessee-titans' },
  { espnId: '28', espnAbbr: 'WSH', nflverseAbbr: 'WAS', sleeperAbbr: 'WAS', name: 'Washington Commanders', slug: 'washington-commanders' },
]

// Builds a lookup map from both a team's current abbreviation and every
// abbreviation it's ever used for the given source, so a caller doesn't
// need to know which era a game/player record came from before resolving
// its team.
function buildAbbrIndex(currentKey, historyKey) {
  const map = new Map()
  for (const team of TEAMS) {
    map.set(team[currentKey], team)
    for (const abbr of team[historyKey] ?? []) map.set(abbr, team)
  }
  return map
}

const byEspnAbbr = buildAbbrIndex('espnAbbr', 'espnAbbrHistory')
const byNflverseAbbr = buildAbbrIndex('nflverseAbbr', 'nflverseAbbrHistory')
const bySleeperAbbr = buildAbbrIndex('sleeperAbbr', 'sleeperAbbrHistory')
const byEspnId = new Map(TEAMS.map((t) => [t.espnId, t]))

export function teamByEspnAbbr(abbr) {
  return byEspnAbbr.get(abbr) ?? null
}

export function teamByNflverseAbbr(abbr) {
  return byNflverseAbbr.get(abbr) ?? null
}

export function teamBySleeperAbbr(abbr) {
  return bySleeperAbbr.get(abbr) ?? null
}

export function teamByEspnId(id) {
  return byEspnId.get(String(id)) ?? null
}
