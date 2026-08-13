import { useEffect, useState } from 'react'
import { NavProvider } from './lib/nav.jsx'
import { parseRoute, routeRemountsOnNavigate } from './lib/route.js'
import { WeekPage } from './screens/WeekPage.jsx'
import { TeamPage } from './screens/TeamPage.jsx'
import { PlayerPage } from './screens/PlayerPage.jsx'
import { GamePage } from './screens/GamePage.jsx'

// One entry per route.js `name` — registering page N+1 is adding it here,
// nothing else in this file changes. Every route's parsed params (minus
// `name`) are spread onto the component as props, so a page's prop names
// must match its route's param names (see route.js's ROUTES table).
const PAGES = {
  week: WeekPage,
  game: GamePage,
  team: TeamPage,
  player: PlayerPage,
}

// The current URL, path + query.
function currentPath() {
  return window.location.pathname + window.location.search
}

// Top-level router over the History API (see lib/route.js — no
// react-router, a handful of route shapes doesn't need one). Replaces the
// single hardcoded-demo screen this file used to be (see docs/STARTER.md
// step 3, now superseded by real week/game/team/player screens).
export default function App() {
  const [route, setRoute] = useState(() => parseRoute(currentPath()))

  useEffect(() => {
    const onPop = () => setRoute(parseRoute(currentPath()))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const go = (path, { replace = false } = {}) => {
    window.history[replace ? 'replaceState' : 'pushState']({}, '', path)
    setRoute(parseRoute(path))
  }

  const { name, ...props } = route
  const Page = PAGES[name]
  // Keyed by the route's own identity only for routes that opt into it
  // (route.js's `remountOnNavigate`) — most screens re-render in place on a
  // param change via useAsync's deps array; a route opts in when a screen
  // holds other per-instance state (GamePage's play cursor) that must reset
  // rather than carry over to a navigation between two instances of the
  // same page.
  const key = routeRemountsOnNavigate(name) ? JSON.stringify(route) : undefined

  return (
    <NavProvider go={go}>
      <Page key={key} {...props} />
    </NavProvider>
  )
}
