// Maps exact tournament names (as stored in DB) → logo file under /public/tournament-logos/
// Drop logo files in /public/tournament-logos/ and add an entry here.
const LOGO_MAP = {
  "ABL'26 - Warm Ups": '/tournament-logos/abl_logo.webp',
}

/** Returns the logo URL for a tournament name, or null if not mapped. */
export function getTournamentLogo(name) {
  return LOGO_MAP[name] ?? null
}
