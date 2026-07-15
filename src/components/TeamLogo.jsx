// Team crest — the logo URL always comes off whatever ESPN payload the
// caller already fetched (scoreboard/team/roster/schedule all embed a team's
// logo), so this is a plain <img>, not a fetching component. A missing src
// (an unlinked/degraded response) renders an empty placeholder box rather
// than a broken-image icon.
export function TeamLogo({ src, name, size = 32 }) {
  if (!src) {
    return (
      <span
        className="tlogo tlogo--empty"
        style={{ width: size, height: size }}
        aria-hidden="true"
      />
    )
  }
  return <img className="tlogo" src={src} alt="" title={name} width={size} height={size} />
}
