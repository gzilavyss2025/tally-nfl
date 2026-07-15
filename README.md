# Tally NFL (starter pack)

Spoiler-safe, read-only second-screen companion for football — same brand
and reveal mechanism as [Tally Baseball](../bbsbh), different domain model.

This is a scaffold, not a working app: a runnable Vite + React shell proving
the shared design tokens and the `SealBox` reveal mechanism work, plus docs
laying out what's genuinely reusable from `bbsbh` vs. what needs a fresh
design for football.

Start here: **`docs/STARTER.md`** (what's copied and why, what to build next)
and **`docs/domain-sketch.md`** (the open reveal-granularity question).

```bash
npm install
npm run dev   # http://localhost:5174
```

Running more than one dev server at once (multiple agents/worktrees)? Ports
5174-5178 (dev) and 4174-4178 (preview) are reserved for this repo — grab the
next free slot with `npm run dev:2`, `dev:3`, `dev:4`, or `dev:5` (and the
matching `preview:N`) instead of guessing a port.
