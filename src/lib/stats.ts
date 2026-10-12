import type { StatRow } from '../types/profile'

/** Sum one stat column over rows; null if every row is missing the stat. `col` is the stat's offset after the team-season index. */
export function sumCol(rows: StatRow[] | undefined, names: string[], stat: string): number | null {
  const c = names.indexOf(stat)
  if (!rows || c < 0) return null
  let total: number | null = null
  for (const r of rows) {
    const v = r[c + 1]
    if (v != null) total = (total ?? 0) + v
  }
  return total
}

export function statObject(row: StatRow, names: string[]): Record<string, number | null> {
  const o: Record<string, number | null> = {}
  names.forEach((n, i) => { o[n] = row[i + 1] ?? null })
  return o
}

export function totals(rows: StatRow[] | undefined, names: string[]): Record<string, number | null> {
  const o: Record<string, number | null> = {}
  for (const n of names) o[n] = sumCol(rows, names, n)
  return o
}

const z = (v: number | null | undefined) => v ?? 0

/** Batting rates from a stat object. Missing HBP/SF count as 0 (standard); null when undefined (e.g. no AB). */
export function battingRates(s: Record<string, number | null>) {
  const ab = z(s.AB), h = z(s.H)
  if (s.AB == null || ab === 0) return { AVG: null, OBP: null, SLG: null, OPS: null }
  const tb = h + z(s['2B']) + 2 * z(s['3B']) + 3 * z(s.HR)
  const obpDen = ab + z(s.BB) + z(s.HBP) + z(s.SF)
  const AVG = h / ab
  const OBP = obpDen ? (h + z(s.BB) + z(s.HBP)) / obpDen : null
  const SLG = tb / ab
  return { AVG, OBP, SLG, OPS: OBP == null ? null : OBP + SLG }
}

export function pitchingRates(s: Record<string, number | null>) {
  const outs = z(s.IPouts)
  if (s.IPouts == null || outs === 0) return { ERA: null, WHIP: null }
  return { ERA: s.ER == null ? null : (27 * s.ER) / outs, WHIP: s.H == null || s.BB == null ? null : (3 * (s.H + s.BB)) / outs }
}

/** Rate like .301 (no leading zero below 1), or "—". */
export function fmtRate(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return '—'
  const s = v.toFixed(3)
  return v < 1 ? s.slice(1) : s
}
export const fmtDec2 = (v: number | null) => (v == null || !Number.isFinite(v) ? '—' : v.toFixed(2))
export const fmtInt = (v: number | null | undefined) => (v == null ? '—' : v.toLocaleString('en-US'))
/** Innings pitched from outs: 200 outs -> "66.2". */
export const fmtIP = (outs: number | null) => (outs == null ? '—' : `${Math.floor(outs / 3)}.${outs % 3}`)

/** Height in inches -> 6' 2". */
export function fmtHeight(inches: string | null): string | null {
  const n = Number(inches)
  if (!inches || !Number.isFinite(n) || n <= 0) return null
  return `${Math.floor(n / 12)}′ ${Math.round(n % 12)}″`
}

/** [2009, 2010, 2011, 2015] -> "2009–2011, 2015". */
export function compressYears(years: number[]): string {
  const ys = [...new Set(years)].sort((a, b) => a - b)
  const out: string[] = []
  for (let i = 0; i < ys.length; ) {
    let j = i
    while (j + 1 < ys.length && ys[j + 1] === ys[j] + 1) j++
    out.push(j > i ? `${ys[i]}–${ys[j]}` : `${ys[i]}`)
    i = j + 1
  }
  return out.join(', ')
}
