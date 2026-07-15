import { useNav } from '../lib/nav.js'
import { teamPath } from '../lib/route.js'

// A plain, spoiler-safe link to a team page — team identity/logo is never a
// spoiler, so this navigates eagerly with no reveal gating. Renders plain
// children (no button chrome) when there's no id to link to.
export function TeamLink({ id, className = '', children }) {
  const navigate = useNav()
  if (!id) return <span className={className}>{children}</span>
  return (
    <button type="button" className={`plink ${className}`} onClick={() => navigate(teamPath(id))}>
      {children}
    </button>
  )
}
