import type { GraphData, Player, RawGraph } from '../types/graph'

const KEYS = ['id','name','x','y','depth','parent','evidence','degree','comp','debut','final','leagues','seasons'] as const

/** Validate a raw columnar payload and return GraphData. Throws on malformed input. */
export function parseGraph(raw: unknown): GraphData {
  const g = raw as RawGraph
  if (!g || typeof g !== 'object' || !g.meta || !g.players || !Array.isArray(g.teamSeasons)) {
    throw new Error('Malformed graph data: missing meta/players/teamSeasons')
  }
  const n = g.players.id?.length
  if (!n) throw new Error('Malformed graph data: no players')
  for (const k of KEYS) {
    if (!Array.isArray(g.players[k]) || g.players[k].length !== n) {
      throw new Error(`Malformed graph data: column "${k}" has wrong length`)
    }
  }
  return { meta: g.meta, teamSeasons: g.teamSeasons, players: g.players, count: n }
}

export function getPlayer(data: GraphData, i: number): Player {
  const p = data.players
  return {
    index: i, id: p.id[i], name: p.name[i], x: p.x[i], y: p.y[i], depth: p.depth[i],
    parent: p.parent[i], evidence: p.evidence[i], degree: p.degree[i], comp: p.comp[i],
    debut: p.debut[i], final: p.final[i], leagues: p.leagues[i], seasons: p.seasons[i],
  }
}

/** Human label for a team-season string like "1927-AL-NYA". */
export function formatTeamSeason(ts: string | undefined): string {
  if (!ts) return ''
  const [year, lg, team] = ts.split('-')
  return team ? `${year} ${team} (${lg})` : ts
}

export async function loadGraph(url = `${import.meta.env.BASE_URL}data/graph.json`): Promise<GraphData> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to load graph data (HTTP ${res.status})`)
  return parseGraph(await res.json())
}
