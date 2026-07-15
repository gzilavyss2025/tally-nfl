# The reveal cursor advances by drive; what's sealed at each step is score state as of that drive's end

`docs/domain-sketch.md` laid out three candidate reveal units (quarter, drive,
scoring play) without picking one. We're taking the synthesis it proposed:
the reveal cursor (the NFL analog of `bbsbh`'s `revealedThrough`) advances one
**drive** at a time, and what a `SealBox` at each step hides is the **score
state as of that drive's end** — not "did anything happen" but "what's the
score now." Non-scoring detail about a drive (play-by-play, yardage, time of
possession) is visible pre-reveal via caller-gated selectors, same as
`bbsbh`'s ADR-0003/ADR-0010 split; only the score itself waits for the tap.

Drive was picked over quarter because a quarter is too coarse a cursor — it
can contain a score on its first snap, so revealing "quarter 1" reveals that
regardless of when in the quarter it happened. It was picked over scoring
play alone because scoring plays aren't evenly spaced through a broadcast;
"seen through the last score" doesn't track how much of the game a delayed
viewer has actually watched through a scoreless stretch. A drive is the
smallest unit that's both strictly ordered and matches "how far into the
broadcast am I," which is what `bbsbh`'s half-inning cursor gives baseball.

This is verified against ESPN's `site.api.espn.com/.../football/nfl/summary`
endpoint (see `docs/domain-sketch.md`'s "not addressed here" — drive was
unconfirmed as a real field until now), checked against two live responses:
`event=401772830` (TB @ ATL, regular Final) and `event=401772834` (NYG @
DAL, Final/OT). `drives.previous` is a chronologically-ordered array; each
drive carries `team`, `result` (`TD`/`PUNT`/`FG`/`INT`/...), `isScore`,
`start`/`end` (`period.number` + `clock`), and a nested `plays` array whose
entries carry `awayScore`/`homeScore` — so "score state as of this drive's
end" is just the last play's score fields, no derivation needed.

Overtime is not a distinct structure in the feed — an OT drive is a normal
drive entry with `period.number: 5`, appended to the same array regulation
drives are in (confirmed against the NYG @ DAL response, `Final/OT`). Per
`bbsbh` ADR-0008 ("extra innings never appear on the up-front navigator,
unlocking one at a time only as `revealedThrough` advances into them"), the
NFL drive navigator must apply the same gate itself — nothing in the feed
marks OT as hidden-until-revealed, so an unguarded drive list would leak
"this game went to overtime" the instant it's fetched, regardless of reveal
state.
