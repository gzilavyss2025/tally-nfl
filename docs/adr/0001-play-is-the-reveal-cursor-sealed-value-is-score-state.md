# The reveal cursor advances by play; what's sealed at each step is score state as of that play

`docs/domain-sketch.md` laid out three candidate reveal units (quarter,
drive, scoring play) without picking one. We're taking it one step past the
synthesis it proposed: the reveal cursor (the NFL analog of `bbsbh`'s
`revealedThrough`) advances one **play** at a time, and what a `SealBox` at
each step hides is the **score state as of that play** — not "did anything
happen" but "what's the score now." Non-scoring detail about a play (down/
distance, yardage, time of possession) is visible pre-reveal via
caller-gated selectors, same as `bbsbh`'s ADR-0003/ADR-0010 split; only the
score itself waits for the tap.

Play was picked over drive because a drive is still too coarse a cursor: a
drive routinely contains several non-scoring snaps before the play that
actually scores, so revealing "through drive 3" reveals that drive's outcome
regardless of which specific play in it a delayed viewer has actually
reached. Play is the smallest strictly-ordered unit the feed hands us — it's
exactly "how far into the broadcast am I," at the same grain a delayed
viewer experiences the game, one snap at a time. Drive was itself picked
over quarter for the identical reason one level up (a quarter can contain a
score on its first snap); play is that same argument taken to its floor.
It was picked over scoring play alone because scoring plays aren't evenly
spaced through a broadcast — "seen through the last score" doesn't track how
much of the game a delayed viewer has actually sat through during a
scoreless stretch.

This is verified against ESPN's `site.api.espn.com/.../football/nfl/summary`
endpoint (see `docs/domain-sketch.md`'s "not addressed here" — play-level
score data was unconfirmed as a real field until now), checked against two
live responses: `event=401772830` (TB @ ATL, regular Final) and
`event=401772834` (NYG @ DAL, Final/OT). `drives.previous` is a
chronologically-ordered array of drives, each carrying a nested `plays`
array that is itself chronologically ordered; every play entry carries
`awayScore`/`homeScore` directly — so "score state as of this play" is just
that play's own score fields, no derivation and no need to walk to the
drive's last play. The drive structure is still relevant as a grouping/
navigation aid (see below) even though it's no longer the reveal unit
itself.

Overtime is not a distinct structure in the feed — an OT drive (and its
plays) is a normal entry in `drives.previous`/`plays` with `period.number:
5`, appended to the same arrays regulation is in (confirmed against the NYG
@ DAL response, `Final/OT`). Per `bbsbh` ADR-0008 ("extra innings never
appear on the up-front navigator, unlocking one at a time only as
`revealedThrough` advances into them"), the NFL play navigator must apply
the same gate itself — nothing in the feed marks OT as hidden-until-reveal,
so an unguarded play list would leak "this game went to overtime" the
instant it's fetched, regardless of reveal state.

**Navigator implication, since this wasn't true at drive grain:** a full
game has on the order of 120-160 plays versus ~20-24 drives, so an
up-front "pick any point to reveal through" list can't reasonably enumerate
every play the way a drive list could. Whatever component implements this
should group by drive for display/scrolling (drive boundaries are still in
the data, just not the reveal unit) while the cursor itself tracks play
index within that structure — closer to a scrubber over an interleaved
drive/play timeline than a flat picker.
