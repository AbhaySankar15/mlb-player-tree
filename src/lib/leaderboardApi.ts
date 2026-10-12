/** Browser client for /api/leaderboard. Every call fails soft: the game works without the leaderboard. */
import type { BoardEntry, SubmitRound } from './leaderboardRules'

export type { BoardEntry }
export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; message: string }

async function call<T>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, init)
    const json = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, status: res.status, message: (json as { error?: string }).error ?? 'Leaderboard unavailable.' }
    return { ok: true, data: json as T }
  } catch {
    return { ok: false, status: 0, message: 'Could not reach the leaderboard.' }
  }
}

export const fetchDaily = (date: string) => call<{ date: string; entries: BoardEntry[] }>(`/api/leaderboard?date=${encodeURIComponent(date)}`)
export const fetchWeek = (end: string) => call<{ end: string; entries: BoardEntry[] }>(`/api/leaderboard?week=${encodeURIComponent(end)}`)
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
