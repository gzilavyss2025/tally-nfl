// Lightweight, dependency-free router over the History API — no react-router
// here on purpose, same reasoning as bbsbh/src/lib/route.js: a handful of
// screen shapes doesn't need a routing library.
//
// A single table (ROUTES) is the source of truth for both directions —
// parsing a path into a route object, and building a path back out of one —
// so adding page N+1 is one entry here instead of hand-editing an if/else
// chain in both `parseRoute` and every `xPath()` builder (which is exactly
// how this file used to be shaped, back when there were 3 routes instead of
// 4). Deliberately still no JSX/React import in this file — App.jsx maps
// `route.name` to a component separately — so route parsing/building stays
// plain-data and unit-testable without a DOM.
//
// Route shapes:
//   '/'                          -> { name: 'week', seasonType: 2, week: 1 }
//   '/week/{seasonType}/{week}'  -> { name: 'week', seasonType, week }
//   '/game/{id}'                 -> { name: 'game', id }
//   '/team/{id}'                 -> { name: 'team', id }
//   '/player/{teamId}/{id}'      -> { name: 'player', teamId, id }
//
// Fixed to the 2025 season — this app doesn't have a season picker yet (see
// docs/domain-sketch.md's "not addressed here": multi-season wasn't in scope
// for the reveal-granularity design either). `player`'s path carries the
// team id because ESPN has no bare "look up an athlete by id" endpoint this
// app uses (see player.js's header comment) — bio comes from that team's
// roster, so the route needs to know which team to ask.
const SEASON = 2025

// `segments`: literal strings match exactly, `:name` captures a param.
// `parse` (optional): raw string params -> the route's final shape (number
// coercion, injecting constants like `season`); omit when the params are
// used as-is (ids stay strings — they're only ever concatenated into a URL
// or compared, never arithmetic).
// `build`: the route's own params -> a path, used by the `xPath()` helpers
// below AND by App.jsx to decide whether navigating within this route
// should force a remount (see `remountOnNavigate`).
// `remountOnNavigate` (optional, default false): App.jsx keys this route's
// page by its full path when true, forcing React to unmount+remount on
// param changes instead of re-rendering in place. Most screens don't need
// this — `useAsync`'s own deps array already refetches cleanly on a prop
// change. Opt in only when a screen holds OTHER per-instance state that
// must not survive a navigation to "the same page, different subject" —
// `GamePage`'s `usePlayCursor` is the first case (see its own comment).
const ROUTES = [
  {
    name: 'week',
    segments: ['week', ':seasonType', ':week'],
    parse: (p) => ({ seasonType: Number(p.seasonType), week: Number(p.week), season: SEASON }),
    build: ({ seasonType, week }) => `/week/${seasonType}/${week}`,
  },
  {
    name: 'game',
    segments: ['game', ':id'],
    build: ({ id }) => `/game/${id}`,
    remountOnNavigate: true,
  },
  {
    name: 'team',
    segments: ['team', ':id'],
    build: ({ id }) => `/team/${id}`,
  },
  {
    name: 'player',
    segments: ['player', ':teamId', ':id'],
    build: ({ teamId, id }) => `/player/${teamId}/${id}`,
  },
]

const DEFAULT_ROUTE = { name: 'week', seasonType: 2, week: 1, season: SEASON }

function matchSegments(segments, parts) {
  if (segments.length !== parts.length) return null
  const params = {}
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    if (seg.startsWith(':')) params[seg.slice(1)] = parts[i]
    else if (seg !== parts[i]) return null
  }
  return params
}

export function parseRoute(path) {
  const parts = (path || '').split('?')[0].split('/').filter(Boolean)
  for (const route of ROUTES) {
    const params = matchSegments(route.segments, parts)
    if (params) return { name: route.name, ...(route.parse ? route.parse(params) : params) }
  }
  return DEFAULT_ROUTE
}

// True if navigating to a different set of params under this route name
// should remount the page rather than re-render it in place — see
// `remountOnNavigate` above. Looked up by name (not by walking ROUTES from
// a path) since App.jsx already has a parsed route in hand.
export function routeRemountsOnNavigate(name) {
  return Boolean(ROUTES.find((r) => r.name === name)?.remountOnNavigate)
}

function pathFor(name, params) {
  const route = ROUTES.find((r) => r.name === name)
  return route.build(params)
}

export function weekPath(seasonType, week) {
  return pathFor('week', { seasonType, week })
}
export function teamPath(id) {
  return pathFor('team', { id })
}
export function playerPath(teamId, id) {
  return pathFor('player', { teamId, id })
}
export function gamePath(id) {
  return pathFor('game', { id })
}
