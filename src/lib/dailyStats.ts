/** Daily challenge helpers, local-only stats ("leaderboard on this device") and share text. Pure and testable. */
import type { Difficulty } from './game'

export interface RoundResult { solved: boolean; points: number; wrong: number; hints: number }
export interface GameRecord {
  /** Local calendar date the game was played, YYYY-MM-DD. */
  date: string
  mode: 'daily' | 'practice'
  difficulty: Difficulty | 'daily'
  score: number
  max: number
  rounds: RoundResult[]
  playedAt: number
}

export const DAILY_DIFFICULTIES: Difficulty[] = ['easy', 'easy', 'medium', 'medium', 'hard']

/** Local date key YYYY-MM-DD (everyone gets the challenge for their own calendar day). */
export function dateKey(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Stable numeric seed from a date key, e.g. "2026-10-12" -> 20261012. */
export function dateSeed(key: string): number {
  return Number(key.replace(/-/g, ''))
}

function dayNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / 86400000)
}

/** Consecutive-day daily streak ending today (or yesterday, if today is not played yet). */
export function dailyStreak(playedDates: string[], today: string): { current: number; best: number } {
  const days = [...new Set(playedDates)].map(dayNumber).sort((a, b) => a - b)
  let best = 0, run = 0
  for (let i = 0; i < days.length; i++) {
    run = i > 0 && days[i] === days[i - 1] + 1 ? run + 1 : 1
    best = Math.max(best, run)
  }
  const set = new Set(days)
  const t = dayNumber(today)
  let cursor = set.has(t) ? t : set.has(t - 1) ? t - 1 : -1
  let current = 0
  while (cursor >= 0 && set.has(cursor)) { current++; cursor-- }
  return { current, best }
}

export function emojiFor(r: RoundResult): string {
  if (!r.solved) return '⬛'
  return r.points >= 3 ? '🟩' : r.points === 2 ? '🟨' : r.points === 1 ? '🟧' : '🟥'
}

export function shareText(rec: GameRecord, url: string): string {
  const title = rec.mode === 'daily' ? `MLB Player Tree Daily ${rec.date}` : `MLB Player Tree (${rec.difficulty})`
  return `${title}\n${rec.score}/${rec.max}\n${rec.rounds.map(emojiFor).join('')}\n${url}`
}

/** Link that reproduces the same rounds for a friend (practice seeds) or opens the daily. */
export function challengeUrl(base: string, rec: { mode: 'daily' | 'practice'; difficulty: string; seed: number }): string {
  const u = new URL(base)
  u.search = ''
  u.hash = ''
  if (rec.mode === 'daily') u.searchParams.set('daily', '1')
  else { u.searchParams.set('seed', String(rec.seed)); u.searchParams.set('difficulty', rec.difficulty) }
  return u.toString()
}

const KEY = 'mlbtree.games.v1'
const MAX_KEPT = 200

/** localStorage wrapper that never throws (private mode, blocked storage, corrupt JSON). */
export function loadGames(storage: Pick<Storage, 'getItem'> | null = safeStorage()): GameRecord[] {
  try {
    const raw = storage?.getItem(KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr.filter(isRecord) : []
  } catch { return [] }
}

export function saveGame(rec: GameRecord, storage: Pick<Storage, 'getItem' | 'setItem'> | null = safeStorage()): boolean {
  try {
    if (!storage) return false
    const games = [...loadGames(storage), rec].slice(-MAX_KEPT)
    storage.setItem(KEY, JSON.stringify(games))
    return true
  } catch { return false }
}

function safeStorage(): Storage | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage } catch { return null }
}

function isRecord(r: unknown): r is GameRecord {
  const g = r as GameRecord
  return !!g && typeof g.date === 'string' && typeof g.score === 'number' && typeof g.max === 'number' && Array.isArray(g.rounds)
}

export function dailyFor(games: GameRecord[], date: string): GameRecord | undefined {
  return games.find((g) => g.mode === 'daily' && g.date === date)
}

export function summarize(games: GameRecord[], today: string) {
  const daily = games.filter((g) => g.mode === 'daily')
  const streak = dailyStreak(daily.map((g) => g.date), today)
  const top = [...games].sort((a, b) => b.score / b.max - a.score / a.max || b.playedAt - a.playedAt).slice(0, 5)
  return { played: games.length, dailyPlayed: daily.length, ...streak, top }
}
