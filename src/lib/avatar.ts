/** Original, generated visuals only (no headshots, no MLB or team logos). */

/** Up to two initials: first + last name word; single-name players get one letter. Accents are kept as the base letter. */
export function initials(name: string): string {
  const words = name.normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[\s.\-]+/).filter((w) => /[A-Za-z]/.test(w))
  if (words.length === 0) return '?'
  const first = words[0][0], last = words.length > 1 ? words[words.length - 1][0] : ''
  return (first + last).toUpperCase()
}

/** Small stable string hash (FNV-1a, 32-bit). */
export function hash(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Deterministic dark-theme-friendly color for a key: { bg, fg }. Same key always gives the same color. */
export function colorFor(key: string): { bg: string; fg: string } {
  const h = hash(key) % 360
  return { bg: `hsl(${h} 45% 28%)`, fg: `hsl(${h} 80% 88%)` }
}

/** Team badge text: Lahman teamID (e.g. "BOS", "NYA"); trimmed to 3 characters. */
export function teamAbbr(teamId: string): string {
  return teamId.slice(0, 3).toUpperCase()
}

const LEAGUE_LABEL: Record<string, string> = {
  NL: 'NL', AL: 'AL', AA: 'AA', UA: 'UA', PL: 'PL', FL: 'FL', NA: 'NA',
}
const NEGRO = new Set(['NNL', 'NN2', 'NAL', 'ECL', 'EWL', 'ANL', 'NSL', 'IND', 'EAS', 'WES', 'NAC', 'INT'])
export const isNegroLeague = (lg: string) => NEGRO.has(lg)

/** Era chip for a league code: "Negro Leagues", "19th century" (NA/UA/PL/AA before 1900), "Federal League", or the code. */
export function leagueChip(lg: string): string {
  if (NEGRO.has(lg)) return 'Negro Leagues'
  if (lg === 'FL') return 'Federal League'
  return LEAGUE_LABEL[lg] ?? lg
}

/** Distinct league chips for a comma-separated league list, with every Negro League code collapsed to one chip. */
export function leagueChips(leagues: string): string[] {
  return [...new Set(leagues.split(',').filter(Boolean).map(leagueChip))]
}

/**
 * Hook for a future licensed image source (e.g. a CC-BY Commons dataset with per-file attribution).
 * Returns null today, so every player gets the generated avatar.
 */
export function playerImageUrl(_playerId: string): string | null {
  return null
}
