# Tally NFL — starter pack

This is a starting point for a football companion in the same spirit as
**Tally Baseball** (`bbsbh`): a spoiler-safe, read-only second-screen PWA.
You watch the game (live or delayed) with the score/plays sealed until you
choose to reveal them. It is a sibling app, not a fork — same brand and
visual language, different domain model.

## What's copied in here, and why

| File | Source | Status |
|---|---|---|
| `src/tokens/*.css` | `bbsbh/src/tokens/` | Copied verbatim — this **is** the Tally brand (paper/ink/kraft-tape palette, IBM Plex + Newsreader type scale, 4px spacing grid). Don't fork it; edit in place if football needs a new token (e.g. a down-marker accent), and consider porting the change back to `bbsbh` if it's brand-level, not sport-level. |
| `src/index.css` | `bbsbh/src/index.css` (trimmed) | Imports the tokens + carries over the `.sealbox`/`.cover`/`.statgrid` rules so `SealBox` renders out of the box. The **ALL-CAPS invariant** (`#root * { text-transform: uppercase }` + `scripts/check-caps.mjs`) is deliberately **not** ported yet — see the comment in the file. Decide if football wants shouted chrome + natural-case commentary before turning it on. |
| `src/components/SealBox.jsx` | `bbsbh/src/components/SealBox.jsx` | Copied verbatim, sport-agnostic as written. This is the one piece of actual *mechanism* worth sharing untouched: a value is never in the DOM until revealed, reveal is one-directional, re-sealing happens by the parent remounting with a fresh `key`. Read the comments in the file before changing it. |
| `package.json`, `vite.config.js`, `index.html`, `src/main.jsx`, `src/App.jsx` | New, minimal | A bare Vite + React 18 shell so the above actually runs (`npm install && npm run dev`, port 5174 so it can run alongside `bbsbh`'s 5173). No PWA plugin, no data layer yet — add both once there's a real screen worth installing/fetching for. |

## What is genuinely NOT ported, and needs its own design

`bbsbh`'s architecture is inning-shaped. None of this transfers as-is:

- **The reveal-granularity unit.** Baseball reveals by half-inning
  (`revealedThrough`, a half-inning index persisted to `localStorage`).
  Football doesn't have an equivalent atomic unit handed to you by the
  data source — you'll need to pick one: by drive, by quarter, by scoring
  play, or some mix. This is the single most important design decision to
  make before writing any NFL-specific code; see `docs/domain-sketch.md`
  for a first pass at the options.
- **The data source.** `bbsbh` hits `statsapi.mlb.com` directly, client-side,
  no backend. There's no NFL equivalent public/free API with the same
  shape — find and vet one (or scope down to what's actually available)
  before assuming the same no-backend architecture holds.
- **The spoiler-only modules split** (`src/api/linescore.js`,
  `src/api/derive.js` in bbsbh — reveal-only, callable only from inside a
  `SealBox`'s render function). The *pattern* (isolate spoiler-revealing
  derivations into modules only reachable post-reveal) is worth keeping;
  the modules themselves are baseball box-score math and don't apply.
- **Every ADR** (`bbsbh/docs/adr/0001`–`0018`) documents a *baseball*
  gotcha (extra innings, per-inning errors being a fielding stat, roster
  primary-position labels, …). Skim them for the *shape* of decision worth
  recording (spoiler-mechanism edge cases), not the content — football
  will accumulate its own list from scratch.

## Conventions to carry over (process, not code)

These are `bbsbh` house rules that are worth adopting from day one rather
than re-learning the hard way:

- **A short root `CLAUDE.md`** (or equivalent for whatever AI tooling you
  use) stating the spoiler rule as the non-negotiable invariant, with
  detail pushed into nested docs so the root file stays under ~200 lines.
  See `bbsbh/CLAUDE.md` for the shape — it explicitly says "read the linked
  ADR before simplifying any of these" for each spoiler mechanism.
- **One ADR per spoiler-mechanism decision**, in `docs/adr/`, written the
  moment you find a gotcha (not months later from memory). `bbsbh`'s ADRs
  are almost all "we got this wrong once, here's the fix and why it must
  stay this way."
- **A domain glossary** (`bbsbh/CONTEXT.md`) defining the vocabulary
  precisely — Seal, SealBox, revealedThrough, half-inning, etc. — so the
  spoiler-rule prose in CLAUDE.md has fixed terms to point at. Football
  needs its own from scratch (drive, possession, down set, scoring play,
  reveal unit — whatever you land on in `domain-sketch.md`).
- **Verify feed field paths against a live game/response** — don't trust
  API docs blindly; `bbsbh`'s `api/statsapi.js` notes exactly which gamePk
  a field path was checked against.
- **MiLB-style graceful degradation.** `bbsbh` treats minor-league feeds as
  a "sometimes missing fields" tier and falls back to `''`/`null`/`—`
  everywhere rather than crashing. Whatever NFL data source you pick will
  have its own incomplete-data tier (preseason, delayed box scores,
  practice-squad moves) — design for it from the first fetch wrapper.

## Suggested first steps

1. Read `docs/domain-sketch.md` and pick a reveal-granularity model.
2. Find and vet an NFL data source; write one fetch wrapper and manually
   diff a real response against what you expect (same discipline as
   `bbsbh/api/statsapi.js`).
3. Build one spoiler-safe screen end to end (e.g. "final score sealed
   behind a `SealBox`, tap to reveal") before building out lineups/rosters
   — that proves the core invariant before anything else is layered on.
4. Start a `CLAUDE.md` + first ADR the moment you hit the first real
   spoiler-mechanism decision (likely: what happens when a live game goes
   to overtime, football's version of bbsbh's "extra innings never spoil"
   problem in ADR-0008).
