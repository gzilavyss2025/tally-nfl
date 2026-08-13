# src — the app shell

React 18 + Vite SPA, phone-first, no backend. This file covers what's
actually in `src/` today: the four screens and the router shell, the
`SealBox` spoiler mechanism, the design system tokens, and the team-ID
crosswalk. The data layer has its own file (`src/api/CLAUDE.md`); the
always-loaded root `CLAUDE.md` carries the spoiler-rule summary and the
high-level "what's unbuilt" map.

**Unit tests** (`npm run test`, Vitest) cover the pure logic layer only —
`route.js`, `lib/weeks.js`, `lib/playCursor.js`, `api/select.js`/`score.js` —
colocated as `*.test.js` next to the module they cover. No component/render
tests yet (`environment: 'node'`, no jsdom) — that's a deliberate scope
line, not an oversight; see `vite.config.js`'s `test` block comment. Every
new pure module added to `src/lib/` or `src/api/` should get a `*.test.js`
alongside it, the same way every new reveal-only selector gets the
spoiler-free/reveal-only split — this is the version of that discipline for
logic correctness rather than spoiler correctness.

## Screens, routing, fetching (`src/App.jsx`, `src/lib/`, `src/screens/`)

Four screens, wireframe-stage — real fetches against live ESPN endpoints,
but shallower than `bbsbh`'s equivalents (no per-game `asOf` cutoff for
`TeamPage`/`PlayerPage` — see ADR-0002's "Not solved here"):

- **`WeekPage`** (`/`, `/week/{seasonType}/{week}`) — the NFL analog of
  `bbsbh`'s day-shaped `GameSelect`, but week-shaped, since a week (not a
  day) is football's scheduling unit. Season-type tabs (Preseason/Regular/
  Postseason) + prev/next week arrows, driven by `src/lib/weeks.js`'s
  `SEASON_WEEKS` list, over one `fetchScoreboard` call. One compact
  `SealBox` per game (`GameCard`) for an at-a-glance final score — a
  deliberately coarser stand-in that stays even now `GamePage` exists,
  since a slate view isn't the place for a play-by-play cursor — plus a
  `GameLink` ("Plays ›") into `GamePage` for the real ADR-0001/0003 grain.
- **`GamePage`** (`/game/{id}`) — the play-by-play screen implementing the
  ADR-0001/0003 reveal cursor (see "Reveal granularity" below for how).
  Reached from `WeekPage`'s `GameLink`; nothing links to it from
  `TeamPage`'s schedule rows yet (see "What to build next").
- **`TeamPage`** (`/team/{id}`) — header, one `SealBox` for record+standing
  (`deriveTeamRecord`, reveal-only — see ADR-0002), roster grouped by
  offense/defense/specialTeam (+ an Injured/Suspended list) linking to
  `PlayerPage`, and a schedule list with one `SealBox` per completed game.
- **`PlayerPage`** (`/player/{teamId}/{id}`) — header + spoiler-free bio
  facts (height/weight/age/college/experience/status), one `SealBox` for
  season+career stat tables (`selectCareerStats`, reveal-only — see
  ADR-0002). Bio comes from `TeamPage`'s own roster fetch, not a standalone
  athlete lookup — ESPN has no CORS-open "athlete by id alone" endpoint this
  app uses (see `src/api/player.js`'s header comment), so the route carries
  `teamId` specifically so the right team's roster can be re-fetched.

**Routing** (`src/lib/route.js`, `src/lib/nav.js`/`nav.jsx`) is a tiny
hand-rolled History-API router, no dependency — a handful of route shapes
doesn't justify pulling in a routing library, same reasoning as `bbsbh`'s
`lib/route.js`. Table-driven, not an if/else chain: `route.js`'s `ROUTES`
array is the single source of truth for both parsing a path AND building
one back out (`weekPath`/`gamePath`/`teamPath`/`playerPath` are thin
wrappers over it) — registering page N+1 is one entry in that table, not a
hand-edit in both directions like it was with 3 routes. `App.jsx`'s own
`PAGES` map (`route.name` -> component) is the other half of that
same "adding a page is one line" property — no if/else there either.
`App.jsx` owns the one `useState<route>` + `popstate` listener;
`NavProvider` threads `go` through context so `TeamLink`/`PlayerLink`/
`GameLink` anywhere in the tree can navigate without a prop drilled through
every intermediate component. Fixed to the 2025 season — no season picker
exists yet (see route.js's header comment). `route.js` itself imports no
React/JSX on purpose, so `route.test.js` exercises parse/build without a
DOM — see the unit-test note above.

Each route can opt into `remountOnNavigate: true` (only `game` does today)
— App.jsx then keys that page by its full route so navigating between two
instances of it (game A -> game B) unmounts/remounts rather than
re-rendering in place. Most screens don't need this (`useAsync`'s deps
array already refetches cleanly on a prop change); it's for a screen that
holds OTHER per-instance state that must reset on navigation, the way
`GamePage`'s `usePlayCursor` does (see "Reveal granularity" below). Reach
for this the next time a screen grows local state keyed to its subject —
don't hand-roll a one-off key prop for it.

**Fetching** (`src/hooks/useAsync.js`, `src/hooks/usePageData.js`) — every
screen's data flows through `usePageData(loadFn, deps, noun)`, which wraps
`useAsync` (tracks loading/error/data, guards against an out-of-order
response clobbering a newer one after a fast nav, keeps stale-while-
revalidate data on a transient refetch error — ported from `bbsbh`,
sport-agnostic as written) together with the `AsyncGate` loading/error/empty
check and a stock `back = () => window.history.back()`, returning
`{ data, gate, back }`. This is the boilerplate every screen was repeating
by copy-paste before there were four of them; a new screen gets it for
free with `const { data, gate, back } = usePageData(loadFn, deps, noun)`.
Two usage shapes, both still valid — `if (gate) return gate` for a screen
that renders nothing else while loading (`GamePage`/`TeamPage`/
`PlayerPage`), or `{gate || <realContent/>}` for a screen that keeps its
own chrome mounted underneath (`WeekPage`'s header/tabs stay up during a
week-to-week refetch). A screen that needs a check beyond loading/error/
empty (`PlayerPage`'s "found the team but not this player on its roster")
still does that itself, after `gate` comes back null. `TeamPage`/
`PlayerPage` each define their own local `loadTeamPage`/`loadPlayerPage`
orchestration function (a `Promise.all` over 2-3 fetches, shaped into what
the screen renders) colocated in the screen file, same convention `bbsbh`'s
`TeamPage.jsx`/`PlayerPage.jsx` use — not pulled into `src/api/` unless a
second screen needs the same orchestration.

Every screen follows the caller-gated selector split `bbsbh` uses:
spoiler-free selectors (`select.js`, `team.js`'s `selectScheduleRow`,
`player.js`'s `selectPlayerBio`) are imported eagerly and called at render
top-level; reveal-only selectors (`score.js`, and now `derive.js` — see
below) are only ever invoked from inside a `SealBox`'s render-function
`children`, never branched on `revealed` inside one selector.

## The spoiler mechanism (`src/components/SealBox.jsx`)

This is copied verbatim from `bbsbh` and is deliberately sport-agnostic —
read the full comment block at the top of the file before touching it, and
don't add football-specific logic to it. The invariant it enforces (root
`CLAUDE.md` states the rule; this is the mechanics):

- `children` is a **render function**, invoked only in the `shown` branch
  (`revealed || forceRevealed`) — never earlier, so there is no
  fetched-and-hidden DOM node holding a score pre-reveal.
- Reveal is **one-directional**: `revealed` only ever goes `false → true`
  via internal `useState`; there is no API to re-seal. Re-sealing happens
  only by the parent unmounting/remounting with a fresh `key` — nothing in
  this repo does that yet (no screen navigates between game segments).
- `onReveal` fires exactly once, after the reveal transition, via a
  `fired` ref guard — so anything it reads is still touched post-reveal.
- `coverless` renders `null` while sealed instead of the kraft-tape
  button, for a surface revealed by a control elsewhere; the guard on
  `children` is unchanged either way — not consumed by any component in
  this repo yet, kept only because it came over with the verbatim copy.
  `compact` is a pure CSS modifier (`.sealbox--compact`), no mechanism
  difference — `GameCard` and `TeamPage`'s schedule rows both use it now,
  for a seal that sits inline in a list row rather than the full-height
  kraft-tape treatment.
- Focus handling: a tap hands focus to the revealed panel
  (`bodyRef.current?.focus()`), but only if the reveal happened via an
  actual tap (`tapped` ref) — a `forceRevealed` mount must not steal focus.
- The cover button's `aria-label` comes from the `label` prop (default
  `'Tap to reveal inning totals'` — a leftover baseball-flavored default
  from the verbatim copy, never actually rendered: every real caller in
  `src/screens/` and `src/components/GameCard.jsx` passes its own
  football-specific, spoiler-free `label`).

**Do not hand-roll spoiler-hiding with CSS `display`/`visibility`.** If a
new surface needs to hide something until reveal, wrap it in `SealBox`.
The corresponding CSS (`.sealbox.cover`, `.cover__lock`, `.cover__main`,
`.sealbox--compact`, `.statgrid`, the `reveal` keyframe) lives in
`src/index.css`, also copied verbatim.

## Reveal granularity: implemented (`GamePage`)

Baseball's cursor (`revealedThrough`, a half-inning index persisted to
`localStorage`) now has an equivalent: `src/hooks/usePlayCursor.js`, at the
ADR-0001 play grain, stepped one play at a time per ADR-0003 (no scrubber,
no jump-to-arbitrary-play), consumed by `GamePage`. `docs/domain-sketch.md`
still has the fuller "why quarter/drive lost" rationale if you need it, but
the decisions themselves are in `docs/adr/0001-*.md` and
`docs/adr/0003-*.md`.

How the pieces fit together:
- **Data split** — `src/api/select.js`'s `selectPlayList(summary)` flattens
  `drives.previous[].plays[]` into a spoiler-free list (down/distance,
  clock, period, possession team), safe to call eagerly; `src/api/score.js`'s
  `selectPlayReveal(summary, index)` re-flattens independently (same
  duplication rationale as `selectFinalScore`/`selectWinner`) and returns
  the one play's `text`/`scoringPlay`/`awayScore`/`homeScore` — verified
  live that a play's own `text` and `type.text` spell out TOUCHDOWN/
  INTERCEPTION/etc. on the play itself, not just the drive summary, so
  both fields had to move to the reveal-only side, not just the score.
- **Cursor state** — `usePlayCursor(gameId, total)` is a flat,
  strictly-increasing play index (not a `{driveIndex, playIndex}` pair —
  ADR-0003 rejected pairing since there's no jump/seek to make it useful),
  persisted to `localStorage` per game. The count itself carries no spoiler
  content, so it's read/written outside any `SealBox`; only the play data
  at each index is reveal-gated. The clamp/step arithmetic itself lives in
  `src/lib/playCursor.js` as plain functions (`clampCount`/`nextCount`/
  `prevCount`/`parseStoredCount`/...), unit-tested in `playCursor.test.js`
  without touching React or `localStorage` — the hook is just `useState` +
  a `try/catch` around `window.localStorage` wrapping those functions.
- **The stepper IS a `SealBox`** — `GamePage` doesn't hand-roll a reveal
  mechanism. The upcoming play is a single `SealBox` keyed by
  `cursor.revealedCount`; tapping it reveals that one play and its
  `onReveal` advances the cursor, which changes the key and mounts a fresh
  (sealed) `SealBox` for the next play. A separate "Prev" button retreats
  the cursor, which — via the same key change — remounts the `SealBox`
  unrevealed again for that play: exactly the "re-sealing happens by the
  parent remounting with a fresh key" mechanism `SealBox.jsx`'s own header
  comment describes, just the first caller to actually use it. Already-
  revealed plays render as a plain, non-sealed log below (indices
  `< cursor.revealedCount`) — calling `selectPlayReveal` for those is safe
  because the cursor itself gates which indices are reachable, the same
  "reveal-only, gated by reveal state" spirit as calling it inside a
  `SealBox` render function, just without a literal wrapper once a play
  has joined the log.
- **OT gate turned out to be free.** ADR-0003 anticipated needing a
  separate explicit "enter overtime" acknowledgment before crossing from
  regulation into OT (mirroring `bbsbh` ADR-0008's extra-innings gate).
  Building it revealed that's unnecessary here: a step-only cursor can only
  ever reach an OT play by having already revealed every regulation play
  in order — there's no list/jump surface for an OT section to leak
  through the way ADR-0001 worried about. `nextPlayLabel()` also never
  renders a total-play count for exactly this reason (an unusually high
  count could hint at OT before it's been earned the normal way).

`WeekPage`'s `GameCard` still seals the whole final score in one `SealBox`
rather than linking straight into play-by-play — a deliberately coarser
at-a-glance view for a 16-game slate, not an attempt at the ADR-0001 grain;
its `GameLink` is how a viewer opts into the real thing. `TeamPage`'s
schedule rows do the same and don't yet link to `GamePage` at all (see
"What to build next"). Building `TeamPage`/`PlayerPage` also surfaced a
*different* gap ADR-0001 doesn't cover: data that aggregates across many
games (a team's record, a player's season/career stats) rather than sealing
one game's outcome. See
`docs/adr/0002-season-and-career-aggregates-are-sealed-as-one-block.md` and
`src/api/derive.js` — the reveal-only-derivation module this file used to
flag as "not built yet."

## Design system (`src/index.css` + `src/tokens/*`)

All CSS lives in `src/index.css`, which `@import`s `src/tokens/*.css` in
this order: `fonts.css`, `colors.css`, `typography.css`, `spacing.css`,
`effects.css`. All five token files are copied verbatim from `bbsbh` (per
root `CLAUDE.md` — don't fork; edit in place only for a genuinely new
football token, e.g. a down-marker accent, and consider porting
brand-level changes back to `bbsbh`).

- **`colors.css`** — paper/ink/kraft-tape palette (`--paper-0..3`,
  `--ink-0..2`/`--graphite`, `--field`/`--clay` as positive/negative
  accents, `--seal`/`--seal-hatch`/`--seal-ink` for spoiler covers) plus
  semantic aliases (`--bg-canvas`, `--surface-card`, `--accent-positive`,
  `--accent-negative`, `--seal-cover`, `--focus-ring`, ...). Use the
  semantic aliases in component CSS, not the raw `--paper-*`/`--ink-*`
  values. Also carries a win-probability chart pair
  (`--winprob-home`/`--winprob-away`) and an `--allstar-blue` accent —
  both are baseball-scoped names inherited with the file; there's no
  football win-probability UI consuming them yet.
- **`typography.css`** — `--font-display` (IBM Plex Sans Condensed,
  chrome/labels), `--font-body` (IBM Plex Sans), `--font-mono` (IBM Plex
  Mono, all numbers), `--font-read` (Newsreader, sentence-like copy e.g.
  play-by-play). Two ready-made classes: `.t-label` (condensed uppercase
  section label) and `.t-num` (mono, tabular figures) — `App.jsx`'s
  `GameCard` already uses both.
- **`spacing.css`** — 4px grid (`--space-0..16`), radii (`--radius-xs..lg`,
  `--radius-pill`), a linescore cell-size pair (`--cell-size`/`--cell-gap`,
  still unused — no linescore-shaped grid exists here yet), a six-rung
  headshot size scale (`--shot-xl-w/h` down to `--shot-2xs-w/h` — `PlayerPage`
  now uses the largest rung, `--shot-xl-w/h`, for its hero headshot, exactly
  the use the comment already named it for; the other five rungs are still
  unused), and app-frame constants (`--app-width: 390px`, `--tap-min: 44px`).
- **`effects.css`** — shadows (`--shadow-card/raised/sticky`), the pressed
  cell inset (`--inset-cell`), motion tokens (`--ease-standard/out`,
  `--dur-fast/med/slow`), and the `--seal-texture`/`--il-texture`
  diagonal-hatch gradients. `.paper-grid` (the faint scorebook grid-paper
  background class `App.jsx` applies to its root div) is defined here.
- **`fonts.css`** — one Google Fonts `@import` for all four families;
  no self-hosting yet.

**The ALL-CAPS invariant is deliberately not ported.** `bbsbh` forces
`#root * { text-transform: uppercase }` with exempted sentence-copy
surfaces, guarded by `scripts/check-caps.mjs`. Neither the CSS rule nor
the guard script exists in this repo — see the block comment at the top of
`src/index.css`. Don't hand-roll `.toUpperCase()` on components to
compensate (that's exactly the drift the guard prevents in `bbsbh`); the
caps question needs a decision (does football commentary want the same
shouted-chrome-vs-sentence-copy split?) before either the CSS rule or its
guard gets ported.

## Team-ID crosswalk (`src/data/teams.js`)

A hand-verified static array of all 32 teams, each carrying `espnId`,
`espnAbbr`, `nflverseAbbr`, `sleeperAbbr`, `name`, `slug`, plus an optional
`*AbbrHistory` array for the three franchises whose abbreviation changed
mid-history within nflverse's 1999+ range (Raiders OAK→LV, Chargers SD→LAC,
Rams STL→LA — `espnId` is the stable anchor across a move, abbreviation is
just an era-specific display string). Lookup helpers
(`teamByEspnAbbr`/`teamByNflverseAbbr`/`teamBySleeperAbbr`/`teamByEspnId`)
check current abbreviation and history together, so a caller doesn't need
to know which era a game/player record is from. This module has no
fetch-side logic and isn't a UI component — it's a plain data table any
screen or `src/api/` selector can import directly. The join-rate/master-key
detail behind why this table has to be hand-maintained (no source
publishes it) belongs to `src/api/CLAUDE.md` and `docs/data-sources.md`,
not here.

## What to build next (forward pointers)

- `TeamPage`'s schedule rows don't link to `GamePage` yet — only
  `WeekPage`'s `GameCard` does. Same gap for any other place a completed
  game could deep-link into its play-by-play.
- No bulk-advance/catch-up affordance on `GamePage` — someone opening the
  app well after a broadcast started has to step through every prior play
  one at a time (worst case ~150 taps). Deliberately deferred by ADR-0003
  ("Not solved here"), not an oversight — revisit if usage shows it's a
  real problem.
- `GamePage` only reads `drives.previous`; a live ('in') game's in-progress
  drive (likely `drives.current`, unverified) isn't handled — a live game
  currently shows whatever plays are already final in `drives.previous`.
- A per-game `asOf` cutoff for `TeamPage`/`PlayerPage`, once a screen can
  reach one of them *from* a specific game (see ADR-0002's "Not solved
  here") — today's single-SealBox-per-aggregate is coarser than that.
- A season picker — every route/fetch here is hardcoded to 2025 (see
  `lib/route.js`'s header comment).
- Bye weeks aren't surfaced anywhere (`fetchTeamSchedule`'s response
  carries a `byeWeek` field `TeamPage` doesn't read yet) — low priority,
  since a bye is already implicit (the team just has no row for that week).
