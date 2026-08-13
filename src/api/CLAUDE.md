# src/api — the data layer

Fetch wrappers and selectors around four undocumented/unofficial NFL data
sources (ESPN, Sleeper, nflverse, TheSportsDB). ESPN is the only one with
consuming screens today (`WeekPage`/`GamePage`/`TeamPage`/`PlayerPage`, see
`src/CLAUDE.md`'s Screens section); Sleeper/nflverse/TheSportsDB are wired
but unconsumed, same as before. This file is the per-module catalog; the
always-loaded root `CLAUDE.md` carries only the spoiler-rule summary and the
"what's genuinely unbuilt" note.

## The spoiler rule, applied here

Every module in this folder sits on one side of the spoiler-free/reveal-only
line; none straddle it (see `src/CLAUDE.md`'s Screens section for how a
screen is expected to consume both sides of one game/team/player at once).

- **Reveal-only** — callable only from inside a `SealBox`'s reveal render
  function, never at render top-level or in an eager `useMemo`:
  - `score.js` (`selectFinalScore`, `selectWinner`) — reads
    `competitors[].score`/`.winner`, the exact fields `select.js` leaves
    untouched.
  - `derive.js` (`deriveTeamRecord`, `selectCareerStats`) — the reveal-only
    *derivation* module (aggregating/reshaping, not just picking a field)
    this file used to flag as "not built yet, follow bbsbh's derive.js
    pattern." Both functions aggregate across many games (a season's
    schedule, a player's career), a spoiler class ADR-0001's per-play model
    doesn't cover — see
    `docs/adr/0002-season-and-career-aggregates-are-sealed-as-one-block.md`
    for why, and why each is sealed as one block rather than gated per-game.
  - `score.js`'s `selectPlayReveal(summary, index)` — the ADR-0001 reveal
    unit itself: one play's `text`/`type`/`scoringPlay`/`awayScore`/
    `homeScore`, re-flattened from `drives.previous[].plays[]`
    independently of `select.js`'s `selectPlayList` (same "must stay
    independently reveal-only-safe to import" reasoning as
    `selectFinalScore`). `GamePage` (`src/CLAUDE.md`) is the only consumer.
- **Spoiler-free** — safe at render top-level:
  - `select.js` (`selectMatchup`, `selectTeamIdentity`) — team identity/logo,
    status detail, `completed`/`state` flags, no score. `selectTeamIdentity`
    is shared by `team.js` and `player.js` too, rather than each reshaping a
    `team` object its own way. `selectPlayList(summary)` flattens
    `drives.previous[].plays[]` into down/distance/clock/period/possession
    per play — the counterpart to `score.js`'s `selectPlayReveal` above.
  - `team.js` (`selectTeamIdentityFromTeamInfo`, `selectScheduleRow`) —
    `selectScheduleRow` deliberately stops at who/when/home-or-away/
    completed, never `winner`/score.
  - `player.js` (`selectPlayerBio`) — height/weight/age/college/experience/
    status off a team roster response.
- **Fetches** (`game.js`, `scoreboard.js`, `team.js`, `player.js`) are all
  safe to call eagerly regardless of what they carry — a raw fetch result
  produces no DOM on its own, same reasoning bbsbh applies to its own eager
  feed fetches. None of them catch their own errors; a failure surfaces to
  the caller (`useAsync`) rather than degrading silently, since these are
  exactly the fetches the spoiler mechanism's data depends on.

## ESPN — ESPN is the only source with consuming screens today

- `espn.js` — the shared `getJson` fetch wrapper every ESPN-backed call goes
  through (mirrors `bbsbh/api/statsapi.js`'s retry/timeout shape: 1 retry,
  15s timeout, retries on `408/425/429/500/502/503/504` and on abort-timeout,
  exponential backoff). Defaults to `https://site.api.espn.com`, no key,
  unversioned, undocumented — can change shape without notice. Takes an
  optional `base` override (added for `player.js`, which needs a different
  ESPN host); every other caller leaves it at the default.
- `game.js` — `fetchGameSummary(eventId)`, ESPN's full game-page payload
  (box score, `drives`, leaders, odds). Returns the raw, unshaped response.
  `GamePage`'s only fetch — the `drives` field is what `select.js`'s
  `selectPlayList` and `score.js`'s `selectPlayReveal` both flatten.
  `WeekPage`/`TeamPage` still get by on `scoreboard.js`/`team.js`'s
  schedule endpoint instead for their own coarser whole-game seal, which
  already carries everything those screens need (matchup, status, score,
  winner) without a per-game fetch. The leaders/odds detail in the summary
  response isn't read by anything yet.
- `scoreboard.js` — `fetchScoreboard({ year, seasonType, week })`, one
  week's full slate. `WeekPage`'s only fetch. Verified live 2026-07-15
  across every 2025 week/seasonType combination — see `src/lib/weeks.js`'s
  header comment for the preseason/postseason week-numbering gotchas found
  doing that (preseason week 1 = Hall of Fame Game only; postseason week 4 =
  Pro Bowl, not a playoff round).
- `team.js` — `fetchTeamInfo`/`fetchTeamRoster`/`fetchTeamSchedule`, all
  confirmed CORS-open live 2026-07-15. `fetchTeamInfo`'s own `team.record`
  field came back empty (`{}`) in testing — `TeamPage` doesn't use it;
  `deriveTeamRecord` (derive.js) computes the record from schedule results
  instead, and `standingSummary` (a precomputed "1st in NFC East" string)
  comes from `selectTeamIdentityFromTeamInfo` instead.
- `player.js` — `fetchAthleteSeasonStats(athleteId)` hits
  `site.web.api.espn.com` (a different host than every other module here,
  via `espn.js`'s `base` override) — confirmed CORS-open live 2026-07-15,
  same as the usual host. A bare `/athletes/{id}` lookup on the usual
  `site.api` host 404s without a team-scoped path (tried live, confirmed),
  so player bio comes from `team.js`'s `fetchTeamRoster` instead —
  `selectPlayerBio` searches every position group for a matching id.
- `select.js` / `score.js` — see "The spoiler rule" above. Both read either
  a `fetchGameSummary` response (`.header.competitions[0]`) or a single
  `fetchScoreboard`/`fetchTeamSchedule` event (`.competitions[0]` directly)
  via a small `competitionOf(x)` helper duplicated in each file — verified
  live 2026-07-15 that both shapes carry the same `competitors[]`/`status`
  fields underneath.
- `derive.js` — see "The spoiler rule" above.

## Wired but not yet consumed by any screen

`sleeper.js`, `nflverse.js`, and `thesportsdb.js` are unchanged from before —
verified against live responses (see `docs/data-sources.md`) but no
component imports them yet. Each is undocumented/unofficial except Sleeper
(documented, but still unversioned with no SLA) — verify field paths against
a live response before trusting them if you wire one in.

- `sleeper.js` — `fetchSleeperPlayers()`, `GET /v1/players/nfl`: the entire
  league's player directory in one ~5MB call. CORS-open, ~1000 req/min,
  cached in module memory for the tab's lifetime (deliberately not
  `localStorage`, see the comment in the file). Sleeper → nflverse join via
  `espn_id`/`gsis_id` only succeeds **46.2%** of the time across active
  nflverse players — do not assume this join is complete for an arbitrary
  player.
- `nflverse.js` — `fetchNflverseGames()` / `fetchNflversePlayers()`, reading
  `public/data/nflverse-games.json` / `nflverse-players.json` (generated by
  `scripts/fetch-nflverse.mjs`, `npm run data:nflverse`) as same-origin
  static assets — nflverse's own GitHub release assets redirect to Azure Blob
  Storage with no CORS header, so a browser `fetch()` against them fails
  outright. Each game row carries `espn` (96.4% populated) — the direct join
  key to an ESPN event id. Each player row carries `gsis_id` plus `espn_id`,
  `pfr_id`, `pff_id`, `otc_id`, `smart_id`, `nfl_id`.
- `thesportsdb.js` — `fetchTheSportsDbNflTeams()`, CORS-open, 30 req/min,
  but the free tier only returns 10 of 32 NFL teams with `idESPN` null on
  every row — logo/badge-art fallback only, never a coverage or ID-join
  source.

## Team identity — `src/data/teams.js`

Lives in `src/data`, not `src/api`, but is the crosswalk every module above
that deals in more than one source needs: none of ESPN/nflverse/Sleeper
agrees on abbreviations for all 32 teams, and none publishes a mapping to the
others, so it's hand-verified and maintained in-repo (methodology and dates
in the file's own header comment; full join model in
`docs/data-sources.md`). Two teams have current-abbreviation mismatches
(Washington: ESPN `WSH` vs. `WAS` elsewhere; Rams: nflverse `LA` vs. `LAR`
elsewhere); three franchises (Raiders, Chargers, Rams) carry
`*AbbrHistory` arrays for their pre-relocation abbreviations (`OAK`, `SD`,
`STL`), since nflverse's data starts in 1999 and old-game lookups are a real
case, not an edge case — the numeric `espnId` is the stable anchor across a
move, abbreviation is just an era-specific display string. Lookup via
`teamByEspnAbbr`, `teamByNflverseAbbr`, `teamBySleeperAbbr`, `teamByEspnId` —
never compare raw abbreviation strings from two sources directly, and never
hand-roll a season-based branch to pick an abbreviation before looking a team
up (the lookup already checks history). None of the three screens need this
crosswalk yet — they stay entirely within ESPN's own ids/abbreviations end to
end; it becomes relevant the moment a screen needs to join in Sleeper or
nflverse data for the same team.

## The build-time-fetch pattern

`nflverse.js` is the one example of this pattern in this repo so far (bbsbh
has many `gen-*.mjs` generators feeding static-JSON readers; this app has
one): an unofficial/CORS-blocked bulk source gets pulled by a Node script
into `public/data/*.json`, which the browser then reads as a same-origin
static asset instead of calling the source directly. Nothing regenerates it
automatically yet — no CI/cron is wired up, `npm run data:nflverse` is a
manual re-run. See `scripts/CLAUDE.md` for the generator's own detail
(the hand-rolled CSV parser, column projection, trim cutoff).

## Related docs

- `docs/data-sources.md` — the full four-source map: what each is for, CORS
  behavior per endpoint (now including `scoreboard`, `teams/{id}`,
  `teams/{id}/roster`, `teams/{id}/schedule`, and the `site.web.api` athlete
  stats endpoint), every measured join rate, rate limits/caching per source.
- `docs/adr/0001-play-is-the-reveal-cursor-sealed-value-is-score-state.md` +
  `docs/adr/0003-play-cursor-advances-one-step-at-a-time.md` — the verified
  ESPN field paths (`drives`, per-play scores) `select.js`/`score.js`'s
  play selectors read, and the design `GamePage`/`usePlayCursor`
  (`src/CLAUDE.md`) implement.
- `docs/adr/0002-season-and-career-aggregates-are-sealed-as-one-block.md` —
  why `derive.js` exists and why it seals a whole aggregate rather than
  gating per-game.
- Root `CLAUDE.md` — the spoiler-safety invariant (`SealBox` mechanics) and
  the "what's genuinely unbuilt" list this whole layer falls under.
