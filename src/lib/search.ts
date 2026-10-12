import type { GraphData } from '../types/graph'

export interface SearchResult {
  index: number
  name: string
  id: string
  years: string
  degree: number
}

/** Lowercase, strip diacritics and punctuation so "José Fernández" matches "jose fernandez". */
export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
}

export interface SearchIndex {
  data: GraphData
  names: string[]
  tokens: string[][]
}

export function buildSearchIndex(data: GraphData): SearchIndex {
  const names = data.players.name.map(normalize)
  return { data, names, tokens: names.map((n) => n.split(' ')) }
}

/**
 * Rank players for a query. Every query token must prefix a distinct name token (order-insensitive).
 * Score: exact name 0, name prefix 1, token match 2, substring 3, playerID prefix 4.
 * Ties: more unique career teammates first, then name, then index (deterministic).
 */
export function search(idx: SearchIndex, query: string, limit = 8): SearchResult[] {
  const q = normalize(query)
  if (q.length < 2) return []
  const qt = q.split(' ')
  const { data, names, tokens } = idx
  const hits: { i: number; score: number }[] = []
  for (let i = 0; i < names.length; i++) {
    let score = -1
    if (names[i] === q) score = 0
    else if (names[i].startsWith(q)) score = 1
    else if (tokensMatch(tokens[i], qt)) score = 2
    else if (names[i].includes(q)) score = 3
    else if (data.players.id[i].startsWith(q.replace(/ /g, ''))) score = 4
    if (score >= 0) hits.push({ i, score })
  }
  const deg = data.players.degree
  hits.sort((a, b) => a.score - b.score || deg[b.i] - deg[a.i] || names[a.i].localeCompare(names[b.i]) || a.i - b.i)
  return hits.slice(0, limit).map(({ i }) => ({
    index: i, name: data.players.name[i], id: data.players.id[i], degree: deg[i],
    years: `${data.players.debut[i]}–${data.players.final[i]}`,
  }))
}

function tokensMatch(nameTokens: string[], qt: string[]): boolean {
  const used = new Set<number>()
  return qt.every((t) => {
    const j = nameTokens.findIndex((nt, k) => !used.has(k) && nt.startsWith(t))
    if (j < 0) return false
    used.add(j)
    return true
  })
}
