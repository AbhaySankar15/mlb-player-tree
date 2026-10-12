import type { Profile, TeamsData } from '../types/profile'

const base = () => `${import.meta.env.BASE_URL}data`
let teamsPromise: Promise<TeamsData> | null = null
const chunks = new Map<number, Promise<Record<string, Profile>>>()

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to load ${url} (HTTP ${res.status})`)
  return (await res.json()) as T
}

export function loadTeams(): Promise<TeamsData> {
  if (!teamsPromise) teamsPromise = getJson<TeamsData>(`${base()}/teams.json`).catch((e) => { teamsPromise = null; throw e })
  return teamsPromise
}

/** Fetch (and cache) the chunk holding this player. A failed fetch is not cached, so the user can retry. */
export async function loadProfile(index: number, playerId: string): Promise<{ profile: Profile; teams: TeamsData }> {
  const teams = await loadTeams()
  const c = Math.floor(index / teams.chunk)
  let p = chunks.get(c)
  if (!p) {
    p = getJson<Record<string, Profile>>(`${base()}/profiles/p${c}.json`).catch((e) => { chunks.delete(c); throw e })
    chunks.set(c, p)
  }
  const profile = (await p)[playerId]
  if (!profile) throw new Error(`No profile found for ${playerId}`)
  return { profile, teams }
}
