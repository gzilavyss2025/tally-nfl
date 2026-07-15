# src — the app shell

React 18 + Vite SPA, phone-first, no backend. This file covers what's
actually in `src/` today: the three screens and the router shell, the
`SealBox` spoiler mechanism, the design system tokens, and the team-ID
crosswalk. The data layer has its own file (`src/api/CLAUDE.md`); the
always-loaded root `CLAUDE.md` carries the spoiler-rule summary and the
high-level "what's unbuilt" map.

## Screens, routing, fetching (`src/App.jsx`, `src/lib/`, `src/screens/`)

Three screens, wireframe-stage — real fetches against live ESPN endpoints,
but shallower than `bbsbh`'s equivalents (no per-game `asOf` cutoff, no
drive-level reveal — see "Reveal granularity" below):

- **`WeekPage`** (`/`, `/week/{seasonType}/{week}`) — the NFL analog of
  `bbsbh`'s day-shaped `GameSelect`, but week-shaped, since a week (not a
  day) is football's scheduling unit. Season-type tabs (Preseason/Regular/
  Postseason) + prev/next week arrows, driven by `src/lib/weeks.js`'s
  `SEASON_WEEKS` list, over one `fetchScoreboard` call. One `SealBox` per
  game (`GameCard`), same grain as the original demo — the drive-cursor
  reveal ADR-0001 designed still isn't implemented (see below).
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
hand-rolled History-API router, no dependency — three route shapes doesn't
justify pulling in a routing library, same reasoning as `bbsbh`'s
`lib/route.js`. `App.jsx` owns the one `useState<route>` + `popstate`
listener; `NavProvider` threads `go` through context so `TeamLink`/
`PlayerLink` anywhere in the tree can navigate without a prop drilled
through every intermediate component. Fixed to the 2025 season — no season
picker exists yet (see route.js's header comment).

**Fetching** (`src/hooks/useAsync.js`) — every screen's data flows through
one `useAsync(loadFn, deps)` call (ported from `bbsbh`, sport-agnostic as
written): tracks loading/error/data, guards against an out-of-order
response clobbering a newer one after a fast nav, keeps stale-while-
revalidate data on a transient refetch error. `TeamPage`/`PlayerPage` each
define their own local `loadTeamPage`/`loadPlayerPage` orchestration
function (a `Promise.all` over 2-3 fetches, shaped into what the screen
renders) colocated in the screen file, same convention `bbsbh`'s
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

## Reveal granularity: decided, not implemented

Baseball's cursor (`revealedThrough`, a half-inning index persisted to
`localStorage`) has no equivalent here yet. The design is settled —
`docs/adr/0001-drive-is-the-reveal-cursor-sealed-value-is-score-state.md`
picks **drive** as the reveal cursor and **score state as of that drive's
end** as what's sealed at each step, verified against two live ESPN
`summary` responses including an OT game — but there is no code
implementing it: no cursor state, no persistence, no drive navigator
component. `docs/domain-sketch.md` has the fuller rationale (why quarter
was too coarse, why scoring-play-alone doesn't track "how far into the
broadcast am I") if you need the tradeoffs before building the navigator,
but the decision itself is in the ADR, not the sketch.

Two things the ADR flags that any future drive-navigator component must
handle, not just the data layer:
- **OT is not a distinct structure in ESPN's feed** — an OT drive is a
  normal entry in `drives.previous` with `period.number: 5`, appended to
  the same array as regulation. A drive navigator must gate OT itself
  (hide it from the up-front list, unlock one entry at a time only as the
  cursor advances into it), the same way `bbsbh` ADR-0008 gates extra
  innings — nothing in the feed does this for you.
- Drive counts aren't symmetric between teams (one team can have 4 drives
  to the other's 6 by half), so whatever renders the drive list can't
  reuse `bbsbh`'s two-parallel-rows `RollingLine` layout unmodified; it
  needs a single interleaved timeline.

No component in `src/` touches `drives` yet — `src/api/game.js` fetches
the full summary (which includes `drives.previous`) but nothing selects
out of it. That selector, when written, should live in `src/api/` per that
folder's own conventions (see `src/api/CLAUDE.md`), following the same
spoiler-free/reveal-only split as `select.js`/`score.js` above: a
drive-list selector exposing non-scoring detail (result, start/end,
time of possession) can run eagerly; a selector exposing the score-state
sealed at each drive must only run inside a `SealBox` render function.

In the meantime, `WeekPage` and `TeamPage` seal the whole final score/result
per game (one `SealBox`, whole game) rather than per-drive — a deliberately
coarser stand-in, not an attempt at the ADR-0001 grain. Building these two
screens also surfaced a *different* gap ADR-0001 doesn't cover at all: data
that aggregates across many games (a team's record, a player's season/career
stats) rather than sealing one game's outcome. See
`docs/adr/0002-season-and-career-aggregates-are-sealed-as-one-block.md` and
`src/api/derive.js` — the first real instance of the reveal-only-derivation
module this file used to flag as "not built yet."

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

- The drive-cursor state and its `localStorage` persistence (see "Reveal
  granularity" above) — no `revealedThrough`-equivalent exists yet; today's
  per-game whole-score seal is a stand-in, not the ADR-0001 design.
- A per-game `asOf` cutoff for `TeamPage`/`PlayerPage`, once a screen can
  reach one of them *from* a specific game (see ADR-0002's "Not solved
  here") — today's single-SealBox-per-aggregate is coarser than that.
- A season picker — every route/fetch here is hardcoded to 2025 (see
  `lib/route.js`'s header comment).
- Bye weeks aren't surfaced anywhere (`fetchTeamSchedule`'s response
  carries a `byeWeek` field `TeamPage` doesn't read yet) — low priority,
  since a bye is already implicit (the team just has no row for that week).
