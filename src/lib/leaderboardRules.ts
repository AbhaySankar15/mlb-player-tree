/** Rules shared by the browser and the /api/leaderboard function: nickname checks, submission validation and score encoding. */
import { MAX_POINTS, ROUNDS, scoreRound } from './scoring.js'

export const NAME_MIN = 3
export const NAME_MAX = 16
export const TOP_N = 50
/** Lowest id wins ties: earlier submissions rank above later ones with the same points. */
const TIE_SPAN = 1_000_000

export interface SubmitRound { solved: boolean; points: number; wrong: number; hints: number }
export interface SubmitBody { date: string; name: string; rounds: SubmitRound[] }
export interface BoardEntry { name: string; score: number; rounds: string }

/** Letters, digits, spaces, underscores, dots and hyphens; no leading/trailing/double spaces. */
const NAME_RE = /^[A-Za-z0-9](?:[A-Za-z0-9 _.-]*[A-Za-z0-9])?$/

/**
 * A deliberately short list: the check is a speed bump, not moderation. Plain substring matching would reject real
 * baseball surnames (Hancock, Dickey, Peacock) and places (Scunthorpe), so only the severe terms match inside a word
 * and the rest must be a whole word.
 */
const SEVERE = ['fuck', 'shit', 'nigg', 'fagg', 'nazi', 'hitler', 'retard']
const WORDS = new Set(['bitch', 'cunt', 'dick', 'cock', 'pussy', 'whore', 'slut', 'bastard', 'asshole', 'ass', 'rape', 'rapist', 'kkk', 'porn', 'cum', 'twat', 'wank', 'fag', 'tits'])

const LEET: Record<string, string> = { '@': 'a', '4': 'a', '3': 'e', '1': 'i', '!': 'i', '|': 'i', '0': 'o', '$': 's', '5': 's', '7': 't' }
const unleet = (w: string) => w.toLowerCase().replace(/[@4310!|$57]/g, (c) => LEET[c]).replace(/[^a-z]/g, '')

export function isBlockedName(name: string): boolean {
  const tokens = name.split(/[\s_.-]+/).filter(Boolean).map(unleet).filter(Boolean)
  // "f u c k": runs of single letters count as one word
  const words: string[] = [], runs: string[] = []
  let run = ''
  for (const t of tokens) { if (t.length === 1) run += t; else { if (run) runs.push(run); run = ''; words.push(t) } }
  if (run) runs.push(run)
  if (words.some((w) => WORDS.has(w) || SEVERE.some((x) => w.includes(x)))) return true
  if (runs.some((r) => [...WORDS, ...SEVERE].some((x) => r.includes(x)))) return true
  const all = tokens.join('')
  return SEVERE.some((x) => all.includes(x))
}

/** Returns an error message, or null when the nickname is acceptable. */
export function validateName(raw: string): string | null {
  const name = raw.trim()
  if (name.length < NAME_MIN || name.length > NAME_MAX) return `Nickname must be ${NAME_MIN}-${NAME_MAX} characters.`
  if (!NAME_RE.test(name) || /\s{2,}/.test(name)) return 'Use letters, numbers, spaces, . _ - only.'
  if (isBlockedName(name)) return 'Please pick a different nickname.'
  return null
}

/** Case-insensitive identity: "Babe Ruth" and "babe  ruth" are the same board slot. */
export function nameKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Checks that a submitted result is internally consistent. Returns the total score, or an error string. */
export function validateRounds(rounds: unknown): { total: number } | { error: string } {
  if (!Array.isArray(rounds) || rounds.length !== ROUNDS) return { error: 'Expected five rounds.' }
  let total = 0
  for (const r of rounds as SubmitRound[]) {
    if (!r || typeof r.solved !== 'boolean' || !Number.isInteger(r.points) || !Number.isInteger(r.wrong) || !Number.isInteger(r.hints)) return { error: 'Malformed round.' }
    if (r.wrong < 0 || r.wrong > 500 || r.hints < 0 || r.hints > 2) return { error: 'Round out of range.' }
    if (r.points !== scoreRound(r.solved, r.wrong, r.hints)) return { error: 'Round points do not match the scoring rules.' }
    total += r.points
  }
  return { total }
}

export function roundsEmoji(rounds: SubmitRound[]): string {
  return rounds.map((r) => (!r.solved ? '⬛' : r.points >= 3 ? '🟩' : r.points === 2 ? '🟨' : r.points === 1 ? '🟧' : '🟥')).join('')
}

/** Seconds since the start (UTC) of the puzzle's date; it tie-breaks the sorted-set score. */
export function elapsedSince(date: string, nowMs: number): number {
  return Math.min(TIE_SPAN - 1, Math.max(0, Math.floor((nowMs - Date.parse(`${date}T00:00:00Z`)) / 1000)))
}
export function encodeScore(points: number, elapsedSeconds: number): number {
  return points * TIE_SPAN + (TIE_SPAN - 1 - elapsedSeconds)
}
export function decodeScore(encoded: number): number {
  return Math.floor(encoded / TIE_SPAN)
}

export const MAX_TOTAL = ROUNDS * MAX_POINTS

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
export function isDateKey(s: unknown): s is string {
  return typeof s === 'string' && DATE_RE.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s)
}

/**
 * Players use their local calendar date for the daily, so the accepted window around the server's UTC date is ±1 day
 * (UTC-12 .. UTC+14 covers every inhabited time zone).
 */
export function dateAcceptable(date: string, nowMs: number): boolean {
  const diff = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.UTC(...utcYmd(nowMs))) / 86400000)
  return diff >= -1 && diff <= 1
}
function utcYmd(ms: number): [number, number, number] {
  const d = new Date(ms)
  return [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()]
}

/** The last `n` date keys ending at `end` (inclusive), newest first. */
export function lastDates(end: string, n: number): string[] {
  const base = Date.parse(`${end}T00:00:00Z`)
  return Array.from({ length: n }, (_, i) => new Date(base - i * 86400000).toISOString().slice(0, 10))
}
