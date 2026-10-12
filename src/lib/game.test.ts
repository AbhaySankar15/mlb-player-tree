import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { commonTeammates, evaluateGuess, generateRound, mulberry32, scoreRound, sharedTeamSeasons, teammates } from './game'
import { buildPathIndex, findPath } from './pathfinder'

// 0-1 (T0), 1-2 (T1), 0-3 (T2), 3-2 (T3), 4-5 (T4); so 0 and 2 are 2 apart via {1,3}.
const small = buildPathIndex({ ts: [[0, 1], [1, 2], [0, 3], [3, 2], [4, 5]] }, 6)

describe('game basics (synthetic)', () => {
  it('computes teammates and common teammates', () => {
    expect([...teammates(small, 0)].sort()).toEqual([1, 3])
    expect(commonTeammates(small, 0, 2)).toEqual([1, 3])
    expect(commonTeammates(small, 0, 4)).toEqual([])
  })
  it('finds shared team-seasons', () => {
    expect(sharedTeamSeasons(small, 0, 1)).toEqual([0])
    expect(sharedTeamSeasons(small, 0, 2)).toEqual([])
  })
  it('evaluates guesses with useful feedback', () => {
    const round = { a: 0, c: 2, connectors: [1, 3] }
    expect(evaluateGuess(small, round, 1)).toEqual({ kind: 'correct' })
    expect(evaluateGuess(small, round, 0).kind).toBe('invalid')
    expect(evaluateGuess(small, round, 4)).toEqual({ kind: 'wrong', withA: false, withC: false })
  })
  it('scores rounds', () => {
    expect(scoreRound(true, 0, 0)).toBe(3)
    expect(scoreRound(true, 1, 1)).toBe(1)
    expect(scoreRound(true, 3, 0)).toBe(0)
    expect(scoreRound(false, 0, 0)).toBe(0)
  })
  it('PRNG is deterministic per seed', () => {
    const a = mulberry32(42), b = mulberry32(42), c = mulberry32(43)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
    expect(mulberry32(42)()).not.toBe(c())
  })
})

describe('game rounds (real data)', () => {
  const rosters = JSON.parse(readFileSync('public/data/memberships.json', 'utf8'))
  const graph = JSON.parse(readFileSync('public/data/graph.json', 'utf8'))
  const idx = buildPathIndex(rosters, graph.players.id.length)
  const degree: number[] = graph.players.degree

  for (const diff of ['easy', 'medium', 'hard'] as const) {
    it(`${diff}: rounds are exactly 2 apart, answers all valid, deterministic by seed`, () => {
      const rng = mulberry32(7)
      for (let k = 0; k < 8; k++) {
        const r = generateRound(idx, degree, rng, diff)
        expect(r.a).not.toBe(r.c)
        expect(findPath(idx, r.a, r.c)!.players.length - 1).toBe(2)
        expect(r.connectors.length).toBeGreaterThan(0)
        for (const m of r.connectors) {
          expect(sharedTeamSeasons(idx, r.a, m).length).toBeGreaterThan(0)
          expect(sharedTeamSeasons(idx, m, r.c).length).toBeGreaterThan(0)
        }
        if (diff === 'hard') expect(r.connectors.length).toBeLessThanOrEqual(2)
        if (diff === 'easy') expect(r.connectors.length).toBeGreaterThanOrEqual(8)
      }
      expect(generateRound(idx, degree, mulberry32(99), diff)).toEqual(generateRound(idx, degree, mulberry32(99), diff))
    })
  }
})
