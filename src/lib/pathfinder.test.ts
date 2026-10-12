import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildPathIndex, findPath } from './pathfinder'

// 0-1 share T0; 1-2 share T1; 2-3 share T2; 4-5 share T3 (separate component); 1 and 3 also share nothing directly.
const small = buildPathIndex({ ts: [[0, 1], [1, 2], [2, 3], [4, 5], [0, 1]] }, 6)

describe('findPath (synthetic)', () => {
  it('finds shortest path with the connecting team-seasons', () => {
    const p = findPath(small, 0, 3)!
    expect(p.players).toEqual([0, 1, 2, 3])
    expect(p.via).toEqual([0, 1, 2]) // T0 is the first roster with 0 and 1
  })
  it('handles same player, direct teammates and reverse direction', () => {
    expect(findPath(small, 2, 2)).toEqual({ players: [2], via: [] })
    expect(findPath(small, 1, 2)!.players).toEqual([1, 2])
    expect(findPath(small, 3, 0)!.players).toEqual([3, 2, 1, 0])
  })
  it('returns null across components (no fabricated links)', () => {
    expect(findPath(small, 0, 4)).toBeNull()
  })
  it('breaks ties by lowest player index', () => {
    // 0 shares T0 with 1 and 2; both share T1 with 3 -> parent of 3 must be 1.
    const idx = buildPathIndex({ ts: [[0, 1, 2], [1, 2, 3]] }, 4)
    expect(findPath(idx, 0, 3)!.players).toEqual([0, 1, 3])
  })
  it('every hop is a real shared team-season', () => {
    const p = findPath(small, 0, 3)!
    p.via.forEach((t, k) => {
      expect(small.rosters[t]).toContain(p.players[k])
      expect(small.rosters[t]).toContain(p.players[k + 1])
    })
  })
})

describe('findPath (real data vs. independent networkx fixture)', () => {
  const rosters = JSON.parse(readFileSync('public/data/memberships.json', 'utf8'))
  const graph = JSON.parse(readFileSync('public/data/graph.json', 'utf8'))
  const idx = buildPathIndex(rosters, graph.players.id.length)
  const fixture = JSON.parse(readFileSync('tests/fixtures/path_pairs.json', 'utf8')).pairs as [number, number, number][]

  it('matches shortest distances for 100 random pairs', () => {
    for (const [a, b, d] of fixture) {
      const p = findPath(idx, a, b)
      if (d < 0) expect(p).toBeNull()
      else {
        expect(p!.players.length - 1).toBe(d)
        expect(p!.players[0]).toBe(a)
        expect(p!.players[p!.players.length - 1]).toBe(b)
        p!.via.forEach((t, k) => {
          expect(idx.rosters[t]).toContain(p!.players[k])
          expect(idx.rosters[t]).toContain(p!.players[k + 1])
        })
      }
    }
  })
  it('agrees with the exported root tree: path to root equals depth', () => {
    const root = graph.meta.rootIndex
    for (const i of [0, 500, 9999, 20000]) {
      expect(findPath(idx, i, root)!.players.length - 1).toBe(graph.players.depth[i])
    }
  })
  it('is fast enough for interactive use', () => {
    const t = performance.now()
    for (let k = 0; k < 20; k++) findPath(idx, k * 100, 23000 - k * 50)
    expect((performance.now() - t) / 20).toBeLessThan(150)
  })
})
