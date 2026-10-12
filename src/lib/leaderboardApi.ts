/** Browser client for /api/leaderboard. Every call fails soft: the game works without the leaderboard. */
import type { BoardEntry, SubmitRound } from './leaderboardRules'

export type { BoardEntry }
export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; message: string }

async function call<T>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, init)
    // Dev servers and misconfigured hosts can answer 200 with index.html; treat anything that is not JSON as unavailable.
    const json = await res.json().catch(() => null)
    if (json === null || typeof json !== 'object') return { ok: false, status: res.ok ? 503 : res.status, message: 'Leaderboard unavailable.' }
    if (!res.ok) return { ok: false, status: res.status, message: (json as { error?: string }).error ?? 'Leaderboard unavailable.' }
    return { ok: true, data: json as T }
  } catch {
    return { ok: false, status: 0, message: 'Could not reach the leaderboard.' }
  }
}

async function board(url: string): Promise<ApiResult<{ entries: BoardEntry[] }>> {
  const r = await call<{ entries?: BoardEntry[] }>(url)
  if (!r.ok) return r
  return Array.isArray(r.data.entries) ? { ok: true, data: { entries: r.data.entries } } : { ok: false, status: 503, message: 'Leaderboard unavailable.' }
}
/** `fresh` adds a throwaway query value so a just-posted score is not hidden by the CDN's 10 s cache of the board. */
export const fetchDaily = (date: string, fresh = false) => board(`/api/leaderboard?date=${encodeURIComponent(date)}${fresh ? `&_=${Date.now()}` : ''}`)
export const fetchWeek = (end: string, fresh = false) => board(`/api/leaderboard?week=${encodeURIComponent(end)}${fresh ? `&_=${Date.now()}` : ''}`)
export const submitScore = (date: string, name: string, rounds: SubmitRound[]) =>
  call<{ rank: number; score: number; entries: BoardEntry[] }>('/api/leaderboard', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, name, rounds }),
  })

const NAME_KEY = 'mlbtree.nickname.v1'
export function loadNickname(): string {
  try { return localStorage.getItem(NAME_KEY) ?? '' } catch { return '' }
}
export function saveNickname(n: string): void {
  try { localStorage.setItem(NAME_KEY, n) } catch { /* private mode */ }
}
