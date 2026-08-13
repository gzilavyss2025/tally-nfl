import { useNav } from '../lib/nav.js'
import { gamePath } from '../lib/route.js'

// A plain, spoiler-safe link to a game's play-by-play page — same shape as
// TeamLink/PlayerLink. Navigating to the game is never a spoiler itself
// (only what's inside GamePage is reveal-gated), so this fires eagerly.
export function GameLink({ id, className = '', children }) {
  const navigate = useNav()
  if (!id) return <span className={className}>{children}</span>
  return (
    <button type="button" className={`plink ${className}`} onClick={() => navigate(gamePath(id))}>
      {children}
    </button>
  )
}
