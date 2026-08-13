# The play cursor advances one step at a time; there is no jump-to-arbitrary-play

ADR-0001 decided the reveal unit is a **play**, not a drive. It left open
*how* someone actually moves the cursor — a full game has on the order of
120-160 plays, too many for a flat up-front picker, and ADR-0001 only
sketched "a scrubber over an interleaved timeline" as one option among
several without picking one.

We're picking the simplest of the three considered: **next/prev-play
buttons only**. There is no scrubber and no drive-grouped expandable list
to tap into an arbitrary play — the cursor can only advance (or retreat) one
play at a time from wherever it currently sits, mirroring `bbsbh`'s
`revealedThrough` in spirit (a strictly-ordered index that moves by one unit
at a time) at the finer play grain.

Two alternatives were considered and rejected:
- **Continuous scrubber** — a single drag control across the whole game.
  Rejected because a slider over ~150 unevenly-meaningful ticks (a punt and
  a game-tying TD are adjacent ticks with wildly different weight) is hard
  to land on precisely without rendering drive/down context anyway, at
  which point it isn't actually simpler than a list.
- **Drive-grouped expandable list** — a list of drives, each expandable to
  its plays, tap any play to jump the cursor there directly. Rejected as
  the *default* interaction: it's more UI surface to build (list + expand/
  collapse + per-play labels) for a jump-ahead capability most delayed
  viewers don't need — someone watching on a normal delay is advancing
  roughly in step with the broadcast, not skipping around.

**Known cost, accepted:** someone who opens the app long after a broadcast
started (e.g. catching up after being away all day) has to step through
every prior play one at a time to reach the current point — up to ~150 taps
in the worst case, not a single jump. This is a real UX gap, not an
oversight; it's deferred rather than solved here (see "Not solved here"
below) because solving it well likely wants the same primitive skipped in
the drive-grouped-list option, and building that primitive now, before any
navigator ships at all, would be speculative.

## What this settles for implementation

- Cursor state is a single strictly-increasing counter (a flat play index
  within the game's chronological `drives[].plays[]` sequence, not a
  `{driveIndex, playIndex}` pair — the pair adds no value without seek/
  jump support), persisted the same way `bbsbh`'s `revealedThrough` is
  (`localStorage`, per-game).
- No component needs to render or hold the full play list up front — only
  the play at the current cursor position (for display) and whether a
  next/prev step is available (cursor not at 0 / not at the last play).
- OT gating (ADR-0001) still applies at the step level: the "next play"
  step must refuse to advance past the last play of regulation until the
  viewer has explicitly acknowledged/entered OT, the same way `bbsbh`
  ADR-0008 gates extra innings — a plain "next" button makes this *easier*
  to enforce than a jump-list would (one choke point instead of every list
  entry needing its own guard).

## Not solved here

- **Fast-forward / catch-up.** No bulk-advance affordance ("skip to end of
  1st quarter", "reveal through halftime") exists in this design. If usage
  shows the ~150-tap worst case is a real problem, the fix is a separate,
  explicitly-designed jump primitive (most likely reusing the rejected
  drive-grouped list, scoped as "jump to end of drive" rather than
  arbitrary play) — not a silent reach for a scrubber, which was rejected
  above for a different reason (imprecision) than the one catch-up would
  need solved (bulk distance).
- **Live vs. delayed auto-advance.** `docs/domain-sketch.md`'s "not
  addressed here" note (whether a live viewer's cursor should auto-advance)
  is still open; a manual stepper is a fine answer for delayed viewing but
  says nothing about live.
