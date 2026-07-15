# Season/career stat aggregates are sealed as one block, pending a real per-game cutoff

ADR-0001 decided the reveal cursor's grain for a *single game*: drive-based,
sealing that drive's score state. Building the Team and Player page
wireframes surfaced a case ADR-0001 doesn't cover — data that aggregates
across *many* games. A team's win-loss record and standing, and a player's
season and career stat lines, are each a function of every game played up to
now, including games the viewer may not have watched yet. Showing any of
these un-gated can spoil a game just as directly as showing its final score
would.

`bbsbh` has a mechanism for exactly this shape of problem — `asOf`/
`LinkScope` caps a team/player page's stats to the day *before* the specific
game a link was opened from, so a career line freezes at "the day before this
game" instead of leaking today's result. This app has no equivalent yet, and
can't trivially get one: `bbsbh`'s team/player pages are always reached from
inside a specific game (so there's a natural date to cut off at); this app's
Team and Player pages are reached from the week slate directly, with no
single game in the navigation context to hang a cutoff off of. That's a real
open design question, not just missing plumbing — see "Not solved here"
below.

## Decision for this pass

Treat the entire record/standing block on `TeamPage` (`deriveTeamRecord`) and
the entire season+career stats block on `PlayerPage` (`selectCareerStats`) as
one sealed unit each, gated behind a single `SealBox`, rather than left
unsealed by default. Both functions live in the new `src/api/derive.js` —
the reveal-only derivation module `src/CLAUDE.md` and `src/api/CLAUDE.md`
both flagged as "not built yet, follow bbsbh's derive.js/linescore.js
pattern"; this is the first concrete need for it.

This overshoots what's strictly necessary — a career stat line from three
seasons ago can't spoil this week's game — but undershoots nothing: nothing
sealed by this rule can leak this week's or any future week's result. Coarse
but safe, matching this project's stated preference (`docs/STARTER.md`) for
graceful degradation over a wrong guess.

Per-game results on `TeamPage`'s schedule list are sealed individually (one
`SealBox` per completed game, via `score.js`'s `selectWinner`/
`selectFinalScore`) rather than folded into the same aggregate seal — that
part follows ADR-0001's existing per-game grain directly and isn't a new
decision.

## Not solved here

Once the drive-cursor/`revealedThrough`-equivalent from ADR-0001 is actually
implemented (see `src/CLAUDE.md`'s "Reveal granularity: decided, not
implemented"), a Team/Player page reached *from* a specific game's screen
should carry the same kind of `asOf` cutoff `bbsbh`'s `LinkScope` provides, so
a career line freezes at "the day before this game" instead of being sealed
wholesale. A page reached from the week slate directly, with no specific game
in context, has no natural cutoff to apply — that's genuinely open, not a
plumbing gap, and needs its own decision (a global "as of today" toggle? the
most recent week the viewer has fully revealed? something else?) before
building it.
