// Maps exact team names (as stored in DB) → logo file under /public/team-logos/
const LOGO_MAP = {
  'Assetz Challengers':       '/team-logos/Assetz20Challengers.webp',
  'Assetz Endless Rally':     '/team-logos/Assetz20Endless20Rally.webp',
  'Backhand Brigade':         '/team-logos/Backhand20Brigade.webp',
  'Big Dawgs':                '/team-logos/Big20Dawgs.webp',
  'Club Shakti':              '/team-logos/Club20Shakti.webp',
  'Court Commanders':         '/team-logos/Court20Commanders.webp',
  'Dhurandhar Smash Squad':   '/team-logos/Dhurandhar20Smash20Squad.webp',
  'Mavericks 63':             '/team-logos/Mavericks2063.webp',
  'Netflicks & Kill':         '/team-logos/Netflicks202620Kill.webp',
  'Shuttle Strikers':         '/team-logos/Shuttle20Strikers.webp',
  'Smash Syndicate':          '/team-logos/Smash20Syndicate.webp',
  'Supersonic':               '/team-logos/Supersonic.webp',
}

/** Returns the logo URL for a team name, or null if not mapped. */
export function getTeamLogo(teamName) {
  return LOGO_MAP[teamName] ?? null
}

/** Returns up to 2 uppercase initials for a team name fallback. */
export function getTeamInitials(teamName) {
  if (!teamName) return '?'
  return teamName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

// Deterministic pastel colour per team for the initials badge fallback
const PALETTE = [
  'bg-red-200 text-red-800',
  'bg-orange-200 text-orange-800',
  'bg-yellow-200 text-yellow-800',
  'bg-green-200 text-green-800',
  'bg-teal-200 text-teal-800',
  'bg-blue-200 text-blue-800',
  'bg-indigo-200 text-indigo-800',
  'bg-purple-200 text-purple-800',
  'bg-pink-200 text-pink-800',
  'bg-rose-200 text-rose-800',
  'bg-cyan-200 text-cyan-800',
  'bg-lime-200 text-lime-800',
]

export function getTeamColor(teamName) {
  if (!teamName) return PALETTE[0]
  let hash = 0
  for (let i = 0; i < teamName.length; i++) hash = (hash * 31 + teamName.charCodeAt(i)) >>> 0
  return PALETTE[hash % PALETTE.length]
}

/** Returns the captain portrait URL for a team name, or null if not mapped. */
export function getTeamCaptain(teamName) {
  if (!teamName) return null
  return `/team-captains/${encodeURIComponent(teamName)}.webp`
}
