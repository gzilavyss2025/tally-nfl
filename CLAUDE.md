# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Tally NFL is a **starter scaffold**, not a working app. It's a spoiler-safe,
read-only second-screen companion for football — a sibling to **Tally
Baseball** (`bbsbh`), sharing its brand/design system and its `SealBox`
reveal mechanism, but with a football-specific domain model that has not
been designed yet.

Read these before making non-trivial changes:
- `README.md` — quick start
- `docs/STARTER.md` — what was copied from `bbsbh` verbatim vs. what needs a
  fresh design, and why
- `docs/domain-sketch.md` — the open "reveal granularity" question (the
  single most important undecided design question in this repo)

## Maintaining these docs

This file is loaded into context on **every** session and persists the whole
session, so its size is a fixed per-session token tax. **Keep it lean** —
under **200 lines**, enforced by `scripts/check-claude-md.mjs` (run by
`npm run lint`). Detail lives in three tiers, most-specific first:

- **Nested `CLAUDE.md`** in `src/`, `src/api/`, and `scripts/` — Claude Code
  loads these only when it navigates into that directory, so subsystem detail
  is paid for on demand, not every session. Per-module prose goes here.
- **`docs/*` and `docs/adr/`** — reference catalogs and the *why* behind
  decisions (data-source verification, the reveal-granularity ADR).
- **A domain glossary** (like `bbsbh/CONTEXT.md`) — not written yet; add one
  once football's vocabulary (drive, possession, down set, reveal unit, ...)
  is settled (see "Conventions worth adopting early" below).

When you're tempted to add detail here, add it to the right tier and leave a
one-line pointer. If the leanness check fails, move content out — don't raise
the cap.

## Commands

```bash
npm install
npm run dev       # http://localhost:5174
npm run build
npm run preview   # http://localhost:4174
npm run lint      # eslint . && check-claude-md.mjs
npm run test      # vitest run — logic layer only, see src/CLAUDE.md
```

Unit tests cover the pure logic layer only (route parsing, selectors, the
play-cursor math) — no component/render tests yet (`vitest`'s default
`environment: 'node'`, no jsdom). Screen behavior is still verified by
actually running the app (see the `run` skill), not a unit test.

### Reserved dev ports (multi-agent safe)

`5174-5178` (dev) and `4174-4178` (preview) belong exclusively to this repo —
`bbsbh` (the sibling baseball app) owns `5173`/`4173` and never these. Both
`server` and `preview` are `strictPort: true` in `vite.config.js`
**deliberately**: a silent auto-increment on conflict would let one agent's
dev server quietly reuse a port a different concurrent agent (or a `bbsbh`
session) is already bound to, instead of failing loudly the way it should.

If multiple agents/worktrees are working in this repo at once, each one
grabs the next free numbered slot instead of guessing a port:

```bash
npm run dev      # 5174 — try this first
npm run dev:2    # 5175 — if 5174 is taken
npm run dev:3    # 5176
npm run dev:4    # 5177
npm run dev:5    # 5178
```

Same pattern for `preview`/`preview:2`../`preview:5` → `4174`-`4178`. If a
`strictPort` error means the port is taken, don't disable `strictPort` or
scan for a free port outside this range — just move to the next numbered
script.

## The non-negotiable invariant: spoiler safety

This app's entire purpose is showing football data without spoiling the
score/outcome until the user asks. **A sealed value must never be present
in the DOM before reveal** — not hidden with CSS, not fetched-then-masked.
`src/components/SealBox.jsx` is the mechanism that enforces this (render-
function `children`, one-directional reveal, remount-with-a-fresh-`key` to
re-seal); full mechanics, the `coverless`/`compact` props, and focus handling
are in `src/CLAUDE.md`. Read the comments at the top of `SealBox.jsx` in full
before modifying it — this is copied verbatim from `bbsbh` and is
deliberately sport-agnostic; don't add football-specific logic to it.

**Do not hand-roll spoiler-hiding with CSS `display`/`visibility`.** If a
new surface needs to hide something until reveal, wrap it in `SealBox`.

## Design system (forked from `bbsbh` as of 2026-08-26 — read before any UI/design work)

**House style is now Apple's design language** (white/`#f5f5f7` canvas, one
blue accent, SF Pro, 980px pill buttons, hairline borders, no card shadows)
— full color/type/spacing/component spec lives in `docs/design-system.md`.
This is a **deliberate fork away from `bbsbh`'s paper/ink/kraft-tape/IBM
Plex brand**, not a drift; do not port these tokens back to `bbsbh`, and
don't re-introduce `bbsbh`-brand values here.

- `src/tokens/*.css` has been migrated: all five files now define
  Apple-derived values under the same semantic alias names the app already
  consumed (`--bg-canvas`, `--text-heading`, `--accent-primary`, ...), so
  no component CSS had to change its variable references — only the
  primitives underneath, plus two explicit radius/uppercase fixups
  (`.weektabs__tab`, `.playstepper__btn`) called out in `src/CLAUDE.md`.
- The `--seal-*` spoiler-cover color set is a **functional** exception, not
  a brand choice — it exists to satisfy `SealBox`'s reveal mechanism (see
  the invariant above). It's now a solid dark (`--color-carbon`) cover with
  a grayscale hatch, not the old kraft amber — recolored, never repurposed
  for anything decorative.
- `.t-num` stays (mono tabular figures retired in favor of SF Pro Text with
  `font-variant-numeric: tabular-nums` — same alignment behavior, on-brand
  font). `.t-label` stays as a class name but dropped the condensed/
  uppercase/tracked styling — this system doesn't shout (see below).
- The **ALL-CAPS question is decided, not deferred**: this house style has
  no shouted-uppercase chrome anywhere (`docs/design-system.md` has no
  uppercase example in any component spec), so `bbsbh`'s
  `#root * { text-transform: uppercase }` + `check-caps.mjs` guard does
  **not** get ported, full stop — see the comment block at the top of
  `src/index.css`.

## Architecture (map) — what's genuinely unbuilt

Don't assume `bbsbh`'s architecture transfers. Three nested `CLAUDE.md` files
carry the per-subsystem detail, loaded when you work there:

- **`src/CLAUDE.md`** — four wireframe-stage screens (`WeekPage`/`GamePage`/
  `TeamPage`/`PlayerPage`) behind a tiny hand-rolled History-API router (no
  react-router), the `SealBox` mechanics, the reveal-granularity design
  (ADR-0001 + ADR-0003, now implemented — `GamePage` runs the play-level
  cursor; `WeekPage`/`TeamPage` still seal a whole game/aggregate at a
  time, a deliberately coarser view, not an unfinished one), and the
  design-system tokens.
- **`src/api/CLAUDE.md`** — fetch wrappers/selectors for four sources (ESPN,
  Sleeper, nflverse, TheSportsDB); only ESPN is consumed by any screen
  today (`scoreboard.js`, `game.js`, `team.js`, `player.js`, plus
  `select.js`/`score.js`/`derive.js` for the spoiler-free/reveal-only split).
  `nflverse.js` **does not hit nflverse directly** — its GitHub release
  files redirect to Azure Blob Storage with no CORS headers, so
  `scripts/fetch-nflverse.mjs` (`npm run data:nflverse`) downloads/trims
  them into `public/data/*.json` as a Node build step first. `src/data/
  teams.js` is the hand-verified 32-team ID crosswalk (no source publishes
  one, and no screen needs it yet — all three stay within ESPN's own ids
  end to end); the full join model and the measured (partial, ~46%)
  Sleeper↔nflverse join rate are in `docs/data-sources.md`. All four
  sources are undocumented/unofficial: verify field paths against a live
  response before trusting them.
- **`scripts/CLAUDE.md`** — `fetch-nflverse.mjs`, the one generator
  establishing the **build-time-fetch pattern** (CORS-blocked/oversized
  source → Node script → static JSON → same-origin read) a future second
  script should follow.

One thing not covered by any nested file yet, since nothing implements it:
- No PWA plugin is wired up yet (see the comment in `vite.config.js`) — add
  `vite-plugin-pwa` once there's a real offline shell worth caching, using
  `bbsbh/vite.config.js`'s NetworkOnly-on-live-data pattern so a stale
  cached score can't spoil the same way a stale baseball score would.

## Conventions worth adopting early (per `docs/STARTER.md`)

- One ADR per spoiler-mechanism decision, written the moment a gotcha is
  found (`bbsbh/docs/adr/*` is almost entirely "we got this wrong once,
  here's the fix and why it must stay this way").
- A domain glossary (like `bbsbh/CONTEXT.md`) once football's vocabulary
  (drive, possession, down set, scoring play, reveal unit, ...) is settled.
- Treat incomplete-data situations (preseason, delayed box scores,
  practice-squad moves) as a first-class case in any fetch wrapper from day
  one — fall back to `''`/`null`/`—` rather than crashing, the same
  discipline `bbsbh` applies to MiLB feeds.
