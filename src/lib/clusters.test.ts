import { describe, expect, it } from 'vitest'
import { buildClusters, clusterRadius, detailFor } from './clusters'

describe('clusters', () => {
  it('bins players into grid cells and keeps every player exactly once', () => {
    const x = [1, 2, 3, 30, 31, -5], y = [1, 2, 3, 30, 31, -5], depth = [1, 1, 2, 3, 3, 4]
    const cs = buildClusters(x, y, depth, 10)
    expect(cs.reduce((s, c) => s + c.count, 0)).toBe(6)
    expect(cs).toHaveLength(3)
    const big = cs.find((c) => c.count === 3)!
    expect(big.depth).toBe(1) // majority depth
    expect(big.x).toBeCloseTo(2)
    expect(cs.find((c) => c.count === 2)!.depth).toBe(3)
  })
  it('puts negative coordinates in their own cells', () => {
    expect(buildClusters([-1, 1], [0, 0], [1, 1], 10)).toHaveLength(2)
  })
  it('radius grows with count and stays under half a cell', () => {
    expect(clusterRadius(100, 100, 20)).toBeLessThanOrEqual(10)
    expect(clusterRadius(25, 100, 20)).toBeLessThan(clusterRadius(100, 100, 20))
    expect(clusterRadius(1, 1000, 20)).toBeGreaterThan(0)
  })
  it('maps camera ratio to detail level', () => {
    expect(detailFor(1.8)).toBe('coarse')
    expect(detailFor(0.4)).toBe('fine')
    expect(detailFor(0.12)).toBe('full')
    expect(detailFor(0.2)).toBe('full')
  })
})
