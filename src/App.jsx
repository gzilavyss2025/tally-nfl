import { useEffect, useState } from 'react'
import { NavProvider } from './lib/nav.jsx'
import { parseRoute } from './lib/route.js'
import { WeekPage } from './screens/WeekPage.jsx'
import { TeamPage } from './screens/TeamPage.jsx'
import { PlayerPage } from './screens/PlayerPage.jsx'

// The current URL, path + query.
function currentPath() {
  return window.location.pathname + window.location.search
}

// Top-level router over the History API (see lib/route.js — no
// react-router, three route shapes doesn't need one). Replaces the single
// hardcoded-demo screen this file used to be (see docs/STARTER.md step 3,
// now superseded by real week/team/player screens).
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

  let content
  if (route.name === 'team') {
    content = <TeamPage id={route.id} />
  } else if (route.name === 'player') {
    content = <PlayerPage teamId={route.teamId} id={route.id} />
  } else {
    content = <WeekPage seasonType={route.seasonType} week={route.week} season={route.season} />
  }

  return <NavProvider go={go}>{content}</NavProvider>
}
