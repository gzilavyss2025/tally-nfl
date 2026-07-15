import { createContext, useContext } from 'react'

// NavContext carries the App's History-API `go`, so a TeamLink/PlayerLink
// anywhere in the tree can navigate without a threaded prop — provider lives
// in nav.jsx (split out so each file exports one kind of thing, same as
// bbsbh's lib/nav.js/nav.jsx split).
export const NavContext = createContext(() => {})

export function useNav() {
  return useContext(NavContext)
}
