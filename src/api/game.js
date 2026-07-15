// Per-game fetch against ESPN's undocumented NFL summary endpoint — the one
// verified in ADR-0001 to carry `drives` (per-drive team/result/isScore/
// start/end) and per-play `awayScore`/`homeScore`, the fields the drive-based
// reveal cursor needs.

import { getJson } from './espn.js'

// The full game summary: box score, drives, leaders, odds, and everything
// else ESPN's game page hydrates from. Returns the RAW response, unshaped —
// this app hasn't built a selection/derivation layer yet (bbsbh's spoiler-only
// split into select.js/derive.js/linescore.js, gated by ADR-0001 in bbsbh, is
// the pattern to follow once there's a screen reading this). Deliberately does
// NOT catch: this is the one fetch the whole spoiler mechanism depends on, so
// a failure should surface to the caller rather than degrade silently.
export async function fetchGameSummary(eventId, options) {
  return getJson(`/apis/site/v2/sports/football/nfl/summary?event=${eventId}`, options)
}
