import { useEffect, useState } from 'react'
import { buildPathIndex, type PathIndex, type Rosters } from './pathfinder'

let cache: Promise<Rosters> | null = null
const fetchRosters = (): Promise<Rosters> => {
  if (!cache) {
    cache = fetch(`${import.meta.env.BASE_URL}data/memberships.json`)
      .then((r) => { if (!r.ok) throw new Error(`Failed to load rosters (HTTP ${r.status})`); return r.json() as Promise<Rosters> })
      .catch((e) => { cache = null; throw e })
  }
  return cache
}

export type RostersState = { status: 'idle' | 'loading' } | { status: 'error'; message: string } | { status: 'ready'; index: PathIndex }

/** Lazily loads rosters (once enabled) and builds the path index. `retry` bumps to re-attempt after an error. */
export function useRosters(enabled: boolean, playerCount: number, retry = 0): RostersState {
  const [state, setState] = useState<RostersState>({ status: 'idle' })
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    setState((s) => (s.status === 'ready' ? s : { status: 'loading' }))
    fetchRosters()
      .then((r) => { if (!cancelled) setState({ status: 'ready', index: buildPathIndex(r, playerCount) }) })
      .catch((e) => { if (!cancelled) setState({ status: 'error', message: e instanceof Error ? e.message : String(e) }) })
    return () => { cancelled = true }
  }, [enabled, playerCount, retry])
  return state
}
