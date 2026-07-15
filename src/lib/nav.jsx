import { NavContext } from './nav.js'

export function NavProvider({ go, children }) {
  return <NavContext.Provider value={go}>{children}</NavContext.Provider>
}
