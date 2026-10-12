import { describe, expect, it } from 'vitest'
import {
  dateAcceptable, decodeScore, elapsedSince, encodeScore, isBlockedName, isDateKey, lastDates, nameKey, roundsEmoji, validateName, validateRounds,
} from './leaderboardRules'

const good = [3, 2, 0, 1, 3].map((points, i) => ({ solved: i !== 2, points, wrong: i === 1 ? 1 : 0, hints: i === 3 ? 2 : 0 }))

describe('nicknames', () => {
  it('accepts normal names and rejects bad ones', () => {
    for (const n of ['Sam', 'Sandlot Sam', 'babe_ruth-3', 'J.D. Drew']) expect(validateName(n)).toBeNull()
    for (const n of ['ab', 'x'.repeat(17), 'bad<script>', '  ', 'two  spaces', '-lead', 'emoji😀x']) expect(validateName(n)).not.toBeNull()
  })
  it('blocks obvious profanity including look-alike spellings', () => {
    for (const n of ['f u c k', 'sh1thead', 'B1tch', 'HITLER fan', 'a$$hole', 'big dick', 'what a c.u.n.t']) expect(isBlockedName(n)).toBe(true)
    for (const n of ['Scunthorpe', 'Hancock', 'R.A. Dickey', 'Peacock Pete', 'Classic', 'Cumberland']) expect(validateName(n)).toBeNull() // real names and places
    expect(isBlockedName('Classic')).toBe(false)
  })
  it('treats case and spacing variants as one name', () => {
    expect(nameKey('  Babe   RUTH ')).toBe('babe ruth')
  })
})

describe('submission validation', () => {
  it('sums consistent rounds', () => {
    expect(validateRounds(good)).toEqual({ total: 9 })
  })
  it('rejects wrong counts, forged points and impossible values', () => {
    expect('error' in validateRounds(good.slice(0, 4))).toBe(true)
    expect('error' in validateRounds(good.map((r, i) => (i === 0 ? { ...r, points: 4 } : r)))).toBe(true)
    expect('error' in validateRounds(good.map((r, i) => (i === 2 ? { ...r, points: 1 } : r)))).toBe(true) // unsolved with points
    expect('error' in validateRounds(good.map((r, i) => (i === 1 ? { ...r, points: 3 } : r)))).toBe(true) // 1 wrong but full points
    expect('error' in validateRounds(good.map((r, i) => (i === 0 ? { ...r, hints: 5 } : r)))).toBe(true)
    expect('error' in validateRounds('nope')).toBe(true)
  })
  it('renders emoji for the board', () => {
    expect(roundsEmoji(good)).toBe('🟩🟨⬛🟧🟩')
  })
})

describe('score encoding', () => {
  it('ranks by points then by earlier submission', () => {
    expect(encodeScore(10, 5)).toBeGreaterThan(encodeScore(10, 900))
    expect(encodeScore(11, 99999)).toBeGreaterThan(encodeScore(10, 0))
    expect(decodeScore(encodeScore(13, 4321))).toBe(13)
    expect(decodeScore(encodeScore(0, 999999))).toBe(0)
  })
  it('measures seconds since the puzzle date', () => {
    expect(elapsedSince('2026-10-12', Date.parse('2026-10-12T00:01:00Z'))).toBe(60)
    expect(elapsedSince('2026-10-12', Date.parse('2026-10-11T12:00:00Z'))).toBe(0)
  })
})

describe('dates', () => {
  it('validates date keys strictly', () => {
    expect(isDateKey('2026-10-12')).toBe(true)
    for (const d of ['2026-13-01', '2026-02-30', '26-10-12', 'x', 5, null]) expect(isDateKey(d)).toBe(false)
  })
  it('accepts the server UTC date plus or minus one day only', () => {
    const now = Date.parse('2026-10-12T03:00:00Z')
    expect(dateAcceptable('2026-10-11', now)).toBe(true)
    expect(dateAcceptable('2026-10-12', now)).toBe(true)
    expect(dateAcceptable('2026-10-13', now)).toBe(true)
    expect(dateAcceptable('2026-10-14', now)).toBe(false)
    expect(dateAcceptable('2026-10-09', now)).toBe(false)
  })
  it('lists the last n dates newest first', () => {
    expect(lastDates('2026-03-02', 3)).toEqual(['2026-03-02', '2026-03-01', '2026-02-28'])
  })
})
