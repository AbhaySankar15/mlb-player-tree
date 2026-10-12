/** Any-to-any shortest teammate paths over the team-season incidence structure (no pairwise edges). */

export interface Rosters {
  /** ts[i] = player indices on teamSeasons[i] */
  ts: number[][]
}

export interface PathIndex {
  rosters: number[][]
  playerTs: number[][]
}

export interface FoundPath {
  /** Player indices from start to end, inclusive. */
  players: number[]
  /** via[k] = team-season index shared by players[k] and players[k+1]. */
  via: number[]
}

export function buildPathIndex(r: Rosters, playerCount: number): PathIndex {
  const playerTs: number[][] = Array.from({ length: playerCount }, () => [])
  r.ts.forEach((players, t) => { for (const p of players) playerTs[p].push(t) })
  return { rosters: r.ts, playerTs }
}

/**
 * Breadth-first search; each team-season is expanded once and the frontier is processed in ascending player index
 * (= ascending playerID), so ties resolve exactly like the root tree: the lowest-index parent wins.
 * Returns null when the players are not connected.
 */
export function findPath(idx: PathIndex, from: number, to: number): FoundPath | null {
  if (from === to) return { players: [from], via: [] }
  const n = idx.playerTs.length
  const parent = new Int32Array(n).fill(-1)
  const via = new Int32Array(n).fill(-1)
  const seen = new Uint8Array(n)
  const tsDone = new Uint8Array(idx.rosters.length)
  seen[from] = 1
  let frontier = [from]
  while (frontier.length) {
    frontier.sort((a, b) => a - b)
    const next: number[] = []
    for (const u of frontier) {
      for (const t of idx.playerTs[u]) {
        if (tsDone[t]) continue
        tsDone[t] = 1
        for (const w of idx.rosters[t]) {
          if (seen[w]) continue
          seen[w] = 1
          parent[w] = u
          via[w] = t
          if (w === to) return rebuild(parent, via, from, to)
          next.push(w)
        }
      }
    }
    frontier = next
  }
  return null
}

function rebuild(parent: Int32Array, via: Int32Array, from: number, to: number): FoundPath {
  const players = [to], v: number[] = []
  for (let cur = to; cur !== from; cur = parent[cur]) {
    v.push(via[cur])
    players.push(parent[cur])
  }
  return { players: players.reverse(), via: v.reverse() }
}
