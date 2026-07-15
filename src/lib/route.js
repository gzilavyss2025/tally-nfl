// Lightweight, dependency-free router over the History API — no react-router
// here on purpose, same reasoning as bbsbh/src/lib/route.js: three screen
// shapes don't need a routing library, just a tiny parse/build pair.
//
// Route shapes:
//   '/'                          -> { name: 'week', seasonType: 2, week: 1 }
//   '/week/{seasonType}/{week}'  -> { name: 'week', seasonType, week }
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

export function parseRoute(path) {
  const parts = (path || '').split('?')[0].split('/').filter(Boolean)

  if (parts.length === 3 && parts[0] === 'week') {
    return { name: 'week', seasonType: Number(parts[1]), week: Number(parts[2]), season: SEASON }
  }
  if (parts.length === 2 && parts[0] === 'team') {
    return { name: 'team', id: parts[1] }
  }
  if (parts.length === 3 && parts[0] === 'player') {
    return { name: 'player', teamId: parts[1], id: parts[2] }
  }
  return { name: 'week', seasonType: 2, week: 1, season: SEASON }
}

export function weekPath(seasonType, week) {
  return `/week/${seasonType}/${week}`
}
export function teamPath(id) {
  return `/team/${id}`
}
export function playerPath(teamId, id) {
  return `/player/${teamId}/${id}`
}
