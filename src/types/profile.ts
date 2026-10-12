export interface TeamsData {
  bat: string[]
  pit: string[]
  chunk: number
  name: string[]
  w: (number | null)[]
  l: (number | null)[]
  rank: (number | null)[]
}

export type StatRow = (number | null)[] // [teamSeasonIndex, ...stats in TeamsData.bat / .pit order]

export interface Bio {
  nameGiven: string | null
  birthYear: string | null
  birthCity: string | null
  birthState: string | null
  birthCountry: string | null
  deathYear: string | null
  height: string | null
  weight: string | null
  bats: string | null
  throws: string | null
  debut: string | null
  finalGame: string | null
  bbrefID: string | null
}

export interface Profile {
  bio: Bio
  apps: [number, number | null][] // [teamSeasonIndex, games]
  pos?: string
  bat?: StatRow[]
  pit?: StatRow[]
}
