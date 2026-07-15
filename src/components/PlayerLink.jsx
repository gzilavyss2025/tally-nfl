import { useNav } from '../lib/nav.js'
import { playerPath } from '../lib/route.js'

// Same convention as TeamLink: a bare-chrome nav button, plain children when
// there's no id/teamId to resolve a path from.
export function PlayerLink({ teamId, id, className = '', children }) {
  const navigate = useNav()
  if (!id || !teamId) return <span className={className}>{children}</span>
  return (
    <button
      type="button"
      className={`plink ${className}`}
      onClick={() => navigate(playerPath(teamId, id))}
    >
      {children}
    </button>
  )
}
