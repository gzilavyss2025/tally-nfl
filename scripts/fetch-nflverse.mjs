// Build-time puller for nflverse's static reference files — NOT a runtime
// fetch wrapper. nflverse publishes these as GitHub release assets, not a
// live API (see docs/data-sources.md); more importantly, the release-asset
// download redirects to Azure Blob Storage, which does not send
// Access-Control-Allow-Origin, so a browser `fetch()` against these URLs
// fails CORS outright (verified 2026-07-15). This script runs under Node
// (no browser, no CORS) and writes trimmed JSON into public/data/ for the
// app to fetch as static assets at runtime — see src/api/nflverse.js.
//
// Run with: npm run data:nflverse

import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, '..', 'public', 'data')

const GAMES_URL = 'https://github.com/nflverse/nflverse-data/releases/download/schedules/games.csv'
const PLAYERS_URL = 'https://github.com/nflverse/nflverse-data/releases/download/players/players.csv'

// Only keep players relevant to a "current season" companion app — the raw
// file carries every player since nflverse's records began (25k+ rows, back
// to the 1970s) and most of that history is dead weight here. Adjust the
// cutoff and re-run if a feature needs older lookups.
const MIN_LAST_SEASON = 2015

const GAMES_COLUMNS = [
  'game_id',
  'season',
  'game_type',
  'week',
  'gameday',
  'away_team',
  'home_team',
  'away_score',
  'home_score',
  'overtime',
  'gsis',
  'pfr',
  'espn',
]

const PLAYERS_COLUMNS = [
  'gsis_id',
  'display_name',
  'position',
  'latest_team',
  'status',
  'espn_id',
  'pfr_id',
  'pff_id',
  'otc_id',
  'smart_id',
  'nfl_id',
  'rookie_season',
  'last_season',
]

// Minimal RFC4180 CSV parser — hand-rolled instead of a dependency because
// nflverse's files need exactly one thing a naive `line.split(',')` gets
// wrong: quoted fields with embedded commas (e.g. headshot URLs like
// `"https://.../f_auto,q_auto/..."`). A column-misaligned split silently
// shifts every field after the first embedded comma, which is worse than
// an obvious crash — confirmed by hand against players.csv before writing
// this.
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n') {
      row.push(field)
      field = ''
      rows.push(row)
      row = []
    } else if (c === '\r') {
      // skip; \n handles the row break
    } else {
      field += c
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

function toRecords(rows) {
  const [header, ...body] = rows
  return body
    .filter((r) => r.length === header.length)
    .map((r) => Object.fromEntries(header.map((key, i) => [key, r[i]])))
}

function project(record, columns) {
  const out = {}
  for (const col of columns) {
    const value = record[col]
    out[col] = value === '' ? null : value
  }
  return out
}

async function fetchText(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`)
  return res.text()
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  console.log('Fetching', GAMES_URL)
  const gamesCsv = await fetchText(GAMES_URL)
  const games = toRecords(parseCsv(gamesCsv)).map((r) => project(r, GAMES_COLUMNS))

  console.log('Fetching', PLAYERS_URL)
  const playersCsv = await fetchText(PLAYERS_URL)
  const playersAll = toRecords(parseCsv(playersCsv)).map((r) => project(r, PLAYERS_COLUMNS))
  const players = playersAll.filter(
    (p) => p.last_season && Number(p.last_season) >= MIN_LAST_SEASON,
  )

  await writeFile(path.join(OUT_DIR, 'nflverse-games.json'), JSON.stringify(games))
  await writeFile(path.join(OUT_DIR, 'nflverse-players.json'), JSON.stringify(players))
  await writeFile(
    path.join(OUT_DIR, 'nflverse-meta.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        sources: { games: GAMES_URL, players: PLAYERS_URL },
        minLastSeason: MIN_LAST_SEASON,
        counts: { games: games.length, playersTotal: playersAll.length, playersKept: players.length },
      },
      null,
      2,
    ),
  )

  console.log(`Wrote ${games.length} games, ${players.length}/${playersAll.length} players to ${OUT_DIR}`)
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
