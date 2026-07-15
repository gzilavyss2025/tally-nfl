# Data sources — what's wired in, and how they join together

Four sources are wired into `src/api/`. None of them is "the" data source —
each covers a different slice, and they only become useful together once you
can move from one source's identifiers to another's. This doc is that map:
what each source gives you, its own native key(s), and the "master key" that
lets you join it to the others. Every join rate and mismatch below was
measured against live data on 2026-07-15, not assumed from docs — see
`nfl_data_sources` in project memory for the earlier source-evaluation pass
this build was based on.

## The four sources

| Source | Wrapper | What it's for | Native key | CORS (browser fetch) |
|---|---|---|---|---|
| ESPN undocumented JSON API | `src/api/espn.js`, `src/api/game.js` | Live/current: scores, drives, box scores, rosters, schedules | numeric `event`/`athlete`/team id | Mixed — see below |
| Sleeper | `src/api/sleeper.js` | Player identity + cross-platform ID lookup | `player_id` (Sleeper's own) | Open (`Access-Control-Allow-Origin: *`) |
| nflverse | `scripts/fetch-nflverse.mjs` → `src/api/nflverse.js` | Historical schedules + player ID crosswalk | `game_id` (games), `gsis_id` (players) | **Blocked** — see below |
| TheSportsDB | `src/api/thesportsdb.js` | Logo/badge artwork fallback | `idTeam`/`idPlayer` | Open, but free tier only covers 10/32 NFL teams |

### ESPN's CORS is inconsistent across endpoints

Confirmed live with an `Origin` header, all 2026-07-15: `summary`,
`scoreboard`, `teams/{id}`, `teams/{id}/roster`, `teams/{id}/schedule`, and
`site.web.api.espn.com/apis/common/v3/.../athletes/{id}/stats` (a
**different host**, used by `src/api/player.js` — see below) all return
`Access-Control-Allow-Origin: *` and are safe to call directly from the
browser (`getJson` in `espn.js` already does this, with an optional `base`
override for the second host). The bare `teams` list endpoint (all 32 teams
in one call) does **not** send that header — don't add a caller that fetches
it client-side, it'll work in curl/Node and then fail silently in the
browser. This is why `src/data/teams.js` below is hand-maintained instead of
fetched: there's no CORS-safe way to pull the full team list at runtime, but
the list is static enough (32 rows) that hand-maintaining it once is cheaper
than working around the gap.

A bare `site.api.espn.com/.../athletes/{id}` lookup (no team scoping) 404s
regardless of CORS — confirmed live against athlete `3929630` (Saquon
Barkley). There's no "look up any athlete by id alone" endpoint this app
uses; `src/api/player.js` gets bio fields from a team-scoped roster fetch
instead (`team.js`'s `fetchTeamRoster`) and only hits the web-api host for
career stats.

### ESPN's scoreboard week numbering has two real gotchas

Confirmed live 2026-07-15 across every `seasontype`/`week` combination for
the 2025 season (see `src/api/scoreboard.js`, `src/lib/weeks.js`):

- **Preseason week 1 is the Hall of Fame Game alone** (1 event), not a full
  slate — the three full preseason slates are weeks 2-4. Week 5 returns zero
  events; preseason doesn't have one.
- **Postseason week 4 is the Pro Bowl**, not a playoff round — Wild Card/
  Divisional/Conference Championship are weeks 1-3 as expected, but week 4
  returns a single "NFC VS AFC" event (an exhibition), with the Super Bowl at
  week 5. `src/lib/weeks.js`'s `SEASON_WEEKS` list encodes both gotchas with
  explicit labels rather than assuming `week` counts cleanly.

### nflverse can't be fetched from the browser at all

nflverse's release files (`games.csv`, `players.csv`) are hosted on GitHub
Releases, but the actual asset download **redirects to Azure Blob Storage**,
and that redirect target sends no `Access-Control-Allow-Origin` header at
all (confirmed by inspecting the full redirect chain's headers). A CORS-mode
`fetch()` in the browser fails on that hop regardless of retry/timeout
handling — there's no client-side fix. This isn't really a CORS bug to work
around, though: nflverse itself documents these as static snapshot files
meant to be pulled into your own store, not a live API (see project
memory's `nfl_data_sources`). So `scripts/fetch-nflverse.mjs` treats it that
way — a Node build step (`npm run data:nflverse`) that downloads and trims
the CSVs and writes JSON into `public/data/`, which the app then fetches at
runtime as an ordinary static asset via `src/api/nflverse.js`. Re-run the
script to refresh; nothing auto-refreshes it yet (no CI/cron wired up).

## The master keys — how to join across sources

### Team identity → `src/data/teams.js`

None of the four sources agree on team abbreviations for all 32 teams, and
none of them publishes a crosswalk between the others, so this table is
hand-verified and maintained in-repo. Confirmed live 2026-07-15:

| Team | ESPN | nflverse | Sleeper |
|---|---|---|---|
| Washington Commanders | `WSH` | `WAS` | `WAS` |
| Los Angeles Rams | `LAR` | `LA` | `LAR` |
| *(all other 30 teams)* | same | same | same |

Every other team uses an identical abbreviation across all three sources —
these two are the only exceptions, and they disagree in different
directions (Washington: ESPN is the odd one out; Rams: nflverse is). Use
`teamByEspnAbbr` / `teamByNflverseAbbr` / `teamBySleeperAbbr` /
`teamByEspnId` from `src/data/teams.js` to normalize before comparing across
sources — never compare raw abbreviation strings from two different
sources directly.

**Relocated franchises are covered, not just current names.** Three teams
changed abbreviation mid-history within the range nflverse's data actually
covers (1999+), so a lookup against an old game is a real, common case, not
an edge case:

| Team | Old abbr (nflverse + ESPN both used it) | Seasons | Current abbr |
|---|---|---|---|
| Raiders | `OAK` | 1999-2019 | `LV` (2020+) |
| Chargers | `SD` | 1999-2016 | `LAC` (2017+) |
| Rams | `STL` | 1999-2015 | `LA`/`LAR` (2016+) |

Confirmed via ESPN's own historical `summary` responses (e.g. a 2015
Raiders game returns `abbr: "OAK"`) that **the team's numeric ESPN id stays
constant across the move** — Raiders are always `espnId: '13'`, whether
the game is from 2015 (`OAK`) or 2025 (`LV`). Abbreviation is an
era-specific display string; id is the stable anchor. `teams.js` encodes
this as `*AbbrHistory` arrays per team, and `teamByNflverseAbbr('OAK')` /
`teamByEspnAbbr('OAK')` / `teamBySleeperAbbr('OAK')` all resolve to the
Raiders same as `'LV'` would — don't hand-roll a season-based branch to
pick the right abbreviation before looking a team up, the lookup already
handles it.

**Still not covered**: the Raiders' earlier Los Angeles stint (1982-1994)
predates nflverse's dataset (starts 1999) entirely, so there's no data to
resolve that era against — not a collision risk (nflverse's current "LA"
for the Rams postdates it by decades) but also not buildable from what's
loaded. No caller needs pre-1999 data yet.

### Game identity → nflverse's `espn` column

`public/data/nflverse-games.json` (generated from nflverse's `games.csv`)
carries an `espn` field that **is** the ESPN event id for that game — no
separate crosswalk table needed, it's a direct column join:

```js
const games = await fetchNflverseGames() // src/api/nflverse.js
const game = games.find(g => g.espn === eventId) // eventId from ESPN's summary/scoreboard
```

Confirmed against the same event `fetchGameSummary` in `src/api/game.js`
already uses for the reveal-cursor demo (`401772830`, TB @ ATL 2025-09-07):
`nflverse-games.json` has that exact row with `espn: "401772830"`,
`game_id: "2025_01_TB_ATL"`. Coverage: 7276/7548 games (96.4%) across the
full 1999–2026 file have a populated `espn` id; the gap is almost entirely
future/unscheduled games, not a data-quality problem in past seasons
(spot-checked 1999, 2010, 2025 — all three seasons are 100% populated).

### Player identity → nflverse's `gsis_id` (partial — read this before relying on it)

`public/data/nflverse-players.json` carries `gsis_id` (nflverse's own
primary key) alongside `espn_id`, `pfr_id`, `pff_id`, `otc_id`, `smart_id`,
and `nfl_id` for the same player — that row **is** the crosswalk for those
five sources, no separate table needed.

Sleeper is the outlier: its player objects carry their own `espn_id` and
`gsis_id` fields directly, so in principle you join Sleeper → nflverse via
either one. In practice, **measured live join rate across all active
nflverse players (`status: "ACT"`) was only 46.2%** (2077/4498) using
`espn_id` OR `gsis_id`, whichever is populated — Sleeper leaves both fields
`null` for a large share of players, especially ones without fantasy
relevance. `espn_id` alone (45.2%) slightly outperforms `gsis_id` alone
(26%); combining both barely improves on `espn_id` alone. **Don't assume an
ID join covers a player just because they're active** — any feature that
needs Sleeper data for an arbitrary nflverse/ESPN player has to handle the
miss case (roughly half the time) rather than treat it as an edge case.
A name+team+position fuzzy fallback would close some of that gap; nothing
in this app needs it yet, so it isn't built.

`nflverse-players.json` itself is trimmed by `scripts/fetch-nflverse.mjs` to
players with `last_season >= 2015` (8935 of nflverse's full 25033-player
history) — widen `MIN_LAST_SEASON` in that script and re-run if a feature
needs older players.

## Rate limits / caching, per source

- **ESPN**: no published limit, no key. `espn.js` already has retry/timeout
  handling; nothing else needed yet.
- **Sleeper**: ~1000 req/min, but the payload itself is the real constraint
  (~5MB, whole-league player directory in one call). `sleeper.js` caches
  in module memory for the tab's lifetime — deliberately not localStorage
  (5MB risks `QuotaExceededError` once combined with anything else the app
  stores; see the comment in that file).
- **nflverse**: not a live API — see above. No rate limit concern, just a
  manual `npm run data:nflverse` to refresh.
- **TheSportsDB**: 30 req/min on the free tier (shared key `123`). Free tier
  also only returns 10 of 32 NFL teams from `search_all_teams.php?l=NFL`,
  and `idESPN` is `null`/`0` on every row it does return — don't build
  anything that depends on TheSportsDB for full-league coverage or for an
  ESPN-id join; it's a badge-image fallback only.
