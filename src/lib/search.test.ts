import { describe, expect, it } from 'vitest'
import { buildSearchIndex, normalize, search } from './search'
import type { GraphData } from '../types/graph'

function fixture(rows: [string, string, number][]): GraphData {
  const n = rows.length
  const col = <T,>(v: T) => Array(n).fill(v) as T[]
  return {
    count: n, teamSeasons: [], meta: {} as GraphData['meta'],
    players: {
      id: rows.map((r) => r[0]), name: rows.map((r) => r[1]), degree: rows.map((r) => r[2]),
      x: col(0), y: col(0), depth: col(0), parent: col(-1), evidence: col(-1), comp: col(0),
      debut: col(2000), final: col(2010), leagues: col('AL'), seasons: col(1),
    },
  }
}

const data = fixture([
  ['hillri01', 'Rich Hill', 944], ['hillbi01', 'Billy Hill', 50], ['hillri02', 'Richie Hillman', 10],
  ['fernajo01', 'José Fernández', 30], ['paigesa01', 'Satchel Paige', 200], ['smithjo01', 'John Smith', 5],
  ['smithjo02', 'John Smith', 90],
])
const idx = buildSearchIndex(data)
const names = (q: string) => search(idx, q).map((r) => r.name)

describe('search', () => {
  it('normalizes accents and punctuation', () => {
    expect(normalize('José Fernández-Ruiz')).toBe('jose fernandez ruiz')
  })
  it('ignores queries shorter than 2 characters', () => {
    expect(names('r')).toEqual([])
  })
  it('ranks exact > prefix > token matches, then by teammate count', () => {
    expect(names('rich hill')[0]).toBe('Rich Hill')
    expect(names('hill')).toEqual(['Rich Hill', 'Billy Hill', 'Richie Hillman'])
  })
  it('matches accent-insensitively and order-insensitively', () => {
    expect(names('jose fernandez')).toEqual(['José Fernández'])
    expect(names('paige satchel')).toEqual(['Satchel Paige'])
  })
  it('keeps same-name players separate, higher degree first', () => {
    const r = search(idx, 'john smith')
    expect(r.map((x) => x.id)).toEqual(['smithjo02', 'smithjo01'])
  })
  it('matches by playerID prefix and respects the limit', () => {
    expect(search(idx, 'paigesa')[0].id).toBe('paigesa01')
    expect(search(idx, 'hill', 2)).toHaveLength(2)
  })
})
