import { describe, expect, it } from 'vitest'
import { formatTeamSeason, getPlayer, parseGraph } from './loadGraph'
import { depthColor, DEPTH_COLORS } from './colors'

const raw = {
  meta: { rootIndex: 0, rootName: 'A' },
  teamSeasons: ['1927-AL-NYA'],
  players: {
    id: ['a', 'b'], name: ['A', 'B'], x: [0, 1], y: [0, 1], depth: [0, 1], parent: [-1, 0],
    evidence: [-1, 0], degree: [1, 1], comp: [0, 0], debut: [2000, 2001], final: [2005, 2006],
    leagues: ['AL', 'NL'], seasons: [3, 4],
  },
}

describe('parseGraph', () => {
  it('parses valid data', () => {
    const d = parseGraph(raw)
    expect(d.count).toBe(2)
    expect(getPlayer(d, 1)).toMatchObject({ id: 'b', parent: 0, evidence: 0, leagues: 'NL' })
  })
  it('rejects missing meta', () => expect(() => parseGraph({ players: {} })).toThrow())
  it('rejects ragged columns', () => {
    const bad = { ...raw, players: { ...raw.players, x: [0] } }
    expect(() => parseGraph(bad)).toThrow(/"x"/)
  })
  it('formats team-season', () => expect(formatTeamSeason('1927-AL-NYA')).toBe('1927 NYA (AL)'))
  it('clamps depth colors', () => expect(depthColor(99)).toBe(DEPTH_COLORS[10]))
})
