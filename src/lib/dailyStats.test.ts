import { describe, expect, it } from 'vitest'
import {
  DAILY_DIFFICULTIES, challengeUrl, dailyFor, dailyStreak, dateKey, dateSeed, emojiFor, loadGames, saveGame, shareText, summarize, type GameRecord,
} from './dailyStats'

const rec = (date: string, score = 10, mode: 'daily' | 'practice' = 'daily'): GameRecord => ({
  date, mode, difficulty: mode === 'daily' ? 'daily' : 'medium', score, max: 15, playedAt: Date.parse(date),
  rounds: [3, 2, 2, 0, 3].map((points, i) => ({ solved: i !== 3, points, wrong: 0, hints: 0 })),
})

function memStorage(initial?: string) {
  let v = initial ?? null
  return { getItem: () => v, setItem: (_k: string, x: string) => { v = x } }
}

describe('dates and seeds', () => {
  it('formats local dates and derives numeric seeds', () => {
    expect(dateKey(new Date(2026, 9, 12))).toBe('2026-10-12')
    expect(dateKey(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(dateSeed('2026-10-12')).toBe(20261012)
  })
  it('daily has five rounds ramping in difficulty', () => {
    expect(DAILY_DIFFICULTIES).toEqual(['easy', 'easy', 'medium', 'medium', 'hard'])
  })
})

describe('streaks', () => {
  it('counts consecutive days ending today or yesterday', () => {
    expect(dailyStreak(['2026-10-10', '2026-10-11', '2026-10-12'], '2026-10-12')).toEqual({ current: 3, best: 3 })
    expect(dailyStreak(['2026-10-10', '2026-10-11'], '2026-10-12')).toEqual({ current: 2, best: 2 }) // today not played yet
    expect(dailyStreak(['2026-10-08', '2026-10-09'], '2026-10-12')).toEqual({ current: 0, best: 2 })
  })
  it('handles gaps, duplicates, month boundaries and empty input', () => {
    expect(dailyStreak(['2026-09-30', '2026-10-01', '2026-10-01', '2026-10-03'], '2026-10-03')).toEqual({ current: 1, best: 2 })
    expect(dailyStreak([], '2026-10-12')).toEqual({ current: 0, best: 0 })
  })
})

describe('sharing', () => {
  it('maps points to emoji squares', () => {
    expect([3, 2, 1, 0].map((points) => emojiFor({ solved: true, points, wrong: 0, hints: 0 }))).toEqual(['🟩', '🟨', '🟧', '🟥'])
    expect(emojiFor({ solved: false, points: 0, wrong: 3, hints: 0 })).toBe('⬛')
  })
  it('builds share text without leaking answers', () => {
    expect(shareText(rec('2026-10-12'), 'https://x.test/?daily=1')).toBe('MLB Player Tree Daily 2026-10-12\n10/15\n🟩🟨🟨⬛🟩\nhttps://x.test/?daily=1')
  })
  it('builds challenge links', () => {
    expect(challengeUrl('https://x.test/path?debug&date=1#h', { mode: 'daily', difficulty: 'daily', seed: 1 })).toBe('https://x.test/path?daily=1')
    expect(challengeUrl('https://x.test/', { mode: 'practice', difficulty: 'hard', seed: 42 })).toBe('https://x.test/?seed=42&difficulty=hard')
  })
})

describe('local storage stats', () => {
  it('saves, loads and finds the daily record', () => {
    const s = memStorage()
    expect(saveGame(rec('2026-10-12'), s)).toBe(true)
    saveGame(rec('2026-10-12', 5, 'practice'), s)
    const games = loadGames(s)
    expect(games).toHaveLength(2)
    expect(dailyFor(games, '2026-10-12')?.score).toBe(10)
    expect(dailyFor(games, '2026-10-13')).toBeUndefined()
  })
  it('survives corrupt data and missing/throwing storage', () => {
    expect(loadGames(memStorage('{not json'))).toEqual([])
    expect(loadGames(memStorage('[{"x":1}]'))).toEqual([])
    expect(loadGames(null)).toEqual([])
    expect(saveGame(rec('2026-10-12'), null)).toBe(false)
    const boom = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }
    expect(loadGames(boom)).toEqual([])
    expect(saveGame(rec('2026-10-12'), boom)).toBe(false)
  })
  it('summarizes streak and top scores', () => {
    const games = [rec('2026-10-11', 6), rec('2026-10-12', 12), rec('2026-10-12', 15, 'practice')]
    const s = summarize(games, '2026-10-12')
    expect(s).toMatchObject({ played: 3, dailyPlayed: 2, current: 2, best: 2 })
    expect(s.top[0].score).toBe(15)
  })
})
