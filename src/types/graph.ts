export interface GraphMeta {
  sourceVersion: string
  dataCoverageStart: number
  dataCoverageEnd: number
  totalPlayers: number
  totalTeamSeasons: number
  rootPlayerId: string
  rootIndex: number
  rootName: string
  rootTeammateCount: number
  componentCount: number
  maximumSeparation: number
  [key: string]: unknown
}

export interface RawGraph {
  meta: GraphMeta
  teamSeasons: string[]
  players: {
    id: string[]
    name: string[]
    x: number[]
    y: number[]
    depth: number[]
    parent: number[]
    evidence: number[]
    degree: number[]
    comp: number[]
    debut: number[]
    final: number[]
    leagues: string[]
    seasons: number[]
  }
}

export interface Player {
  index: number
  id: string
  name: string
  x: number
  y: number
  depth: number
  parent: number
  evidence: number
  degree: number
  comp: number
  debut: number
  final: number
  leagues: string
  seasons: number
}

export interface GraphData {
  meta: GraphMeta
  teamSeasons: string[]
  players: RawGraph['players']
  count: number
}
