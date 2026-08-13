# Reveal-granularity: options for the NFL equivalent of `revealedThrough`

**Decided** — see `docs/adr/0001-play-is-the-reveal-cursor-sealed-value-is-score-state.md`.
A refinement of the "plausible synthesis" below: **play**, not drive, is the
cursor (score-state as what's sealed still holds), verified against real
ESPN responses. The rest of this doc is kept as the menu of options
considered and why they lost, per `bbsbh`'s convention (per ADR-0002/ADR-0008
in `bbsbh`) of the reveal mechanism's shape driving almost everything built
on top of it.

Baseball's unit (half-inning) works because it's small, strictly ordered,
and every play belongs to exactly one. Football's candidates trade off
those same three properties differently:

## Option A — by quarter
- **Pro:** simplest, matches how fans naturally segment a broadcast delay
  ("I'm through the 2nd quarter"). Trivial `revealedThrough` analog: an
  integer 1–4 (+ OT).
  - **Con:** coarse. A quarter can contain a pick-six on the first snap —
  revealing "quarter 1" reveals that regardless of when in the quarter the
  score actually happened. Loses the "I've seen exactly this many plays"
  precision `bbsbh` has at the half-inning level.

## Option B — by drive/possession
- **Pro:** closer to bbsbh's half-inning in spirit — a possession is a
  natural, strictly-ordered unit, and most drives end in a defined event
  (score, punt, turnover, turnover on downs, half/game end). Reveal-by-drive
  means "I've seen every play through the Bears' 3rd drive," which is a
  believable mental model for someone watching on delay.
  - **Con:** drive counts aren't symmetric between teams the way innings are
  (one team can have 4 drives to the other's 6 by half), so the UI can't
  reuse bbsbh's "away row / home row" `RollingLine` layout unmodified —
  you'd need a single interleaved drive timeline instead of two parallel
  rows.

## Option C — by scoring play
- **Pro:** the actual spoiler-relevant unit — nothing about a non-scoring
  play spoils the score. Revealing "up through the last score" is the
  minimum granularity that still tracks "how much of the game have I
  watched."
  - **Con:** doesn't map to "have I watched this part of the game" the way
  bbsbh's model does — a viewer 40 minutes into a 3-hour broadcast during a
  scoreless stretch has "seen" a lot of game with nothing to reveal yet.
  Probably wrong as the *only* unit, but worth layering under A or B as
  what actually gets hidden (score state) vs. what the reveal cursor
  advances over (quarters/drives).

## A plausible synthesis (superseded — see ADR-0001)
The original synthesis here proposed drive as cursor, score-state as what's
sealed. ADR-0001 refines this one notch finer: reveal cursor = **play**
(matches "how far into the broadcast am I" at the actual snap-by-snap grain
a delayed viewer experiences, rather than drive's coarser "which drive"),
what's sealed at each step = **score state as of that play** (matches
"don't show me anything scoring-relevant early"). Drive lost to play for
the same reason quarter lost to drive one level up: a drive can still
contain several non-scoring snaps before its scoring play, so "revealed
through drive N" reveals more than the viewer has actually watched. This
mirrors bbsbh's split almost exactly: `revealedThrough` is a half-inning
index (the cursor), but what's sealed behind each `SealBox` is that half's
*runs*, not "did anything happen" — non-scoring events (a fielder's choice,
a mound visit) are visible pre-reveal via the caller-gated selectors
(ADR-0003, ADR-0010); only run-scoring outcomes wait for the tap.

## Overtime
bbsbh's answer to "the game might not end when expected" is ADR-0008:
extra innings never appear on the up-front navigator, unlocking one at a
time only as `revealedThrough` advances into them. NFL overtime (sudden
death in the regular season vs. guaranteed-possession rules in the
playoffs) will need its own version of this — likely: OT doesn't render as
a selectable section at all until the viewer has revealed through the end
of regulation, exactly like extra innings.

## Not addressed here
- Whether "drive" is even a cleanly available field on whatever data source
  gets picked (see `STARTER.md` — data source is still unvetted).
- Live vs. delayed viewing mode, and whether the reveal cursor needs to
  auto-advance for live viewers the way bbsbh's does not (bbsbh is
  delay-agnostic; football's much shorter game length and heavier "watching
  live but avoiding score alerts" use case might change that).
