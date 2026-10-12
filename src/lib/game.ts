/** "Name the link": given two players exactly two teammate-hops apart, name a player who was a teammate of both. */
import type { PathIndex } from './pathfinder'

export type Difficulty = 'easy' | 'medium' | 'hard'
import { MAX_POINTS, ROUNDS, scoreRound } from './scoring'
export { MAX_POINTS, ROUNDS, scoreRound }

export interface Round {
  a: number
  c: number
  /** Every player who was a teammate of both a and c (all valid answers). */
  connectors: number[]
}

/** Small deterministic PRNG so rounds are reproducible from a seed (also used by the daily challenge later). */
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

/** All teammates of p (never includes p). */
export function teammates(idx: PathIndex, p: number): Set<number> {
  const s = new Set<number>()
  for (const t of idx.playerTs[p]) for (const q of idx.rosters[t]) s.add(q)
  s.delete(p)
  return s
}

export function commonTeammates(idx: PathIndex, a: number, c: number): number[] {
  const na = teammates(idx, a), nc = teammates(idx, c)
  const out: number[] = []
  for (const q of na) if (nc.has(q)) out.push(q)
  return out.sort((x, y) => x - y)
}

/** Team-season indices shared by two players (empty if not teammates). */
export function sharedTeamSeasons(idx: PathIndex, a: number, b: number): number[] {
  const bs = new Set(idx.playerTs[b])
  return idx.playerTs[a].filter((t) => bs.has(t))
}

const CONNECTOR_RANGE: Record<Difficulty, [number, number]> = { easy: [8, Infinity], medium: [3, 12], hard: [1, 2] }

/**
 * Pick two players at distance exactly 2 (not teammates, at least one common teammate).
 * easy: both players from the top 15% by teammates (a proxy for well-known) and many valid answers; medium: the better-connected
 * half of players; hard: anyone, with only 1-2 valid answers.
 * Constraints relax after many failed tries so generation always terminates.
 */
export function generateRound(idx: PathIndex, degree: ArrayLike<number>, rng: () => number, difficulty: Difficulty): Round {
  const n = idx.playerTs.length
  const eligible = (p: number) => idx.playerTs[p].length > 0
  const sorted = [...Array(n).keys()].filter(eligible).sort((x, y) => degree[y] - degree[x])
  const bigPool = sorted.slice(0, Math.max(200, Math.floor(sorted.length * 0.15)))
  const midPool = sorted.slice(0, Math.floor(sorted.length * 0.5))
  for (let attempt = 0; attempt < 600; attempt++) {
    const relax = attempt > 300
    const pool = relax ? sorted : difficulty === 'easy' ? bigPool : difficulty === 'medium' ? midPool : sorted
    const a = pool[Math.floor(rng() * pool.length)]
    const na = teammates(idx, a)
    if (na.size === 0) continue
    const arr = [...na]
    const m = arr[Math.floor(rng() * arr.length)]
    const second = [...teammates(idx, m)].filter((q) => q !== a && !na.has(q))
    if (second.length === 0) continue
    const c = second[Math.floor(rng() * second.length)]
    if (difficulty === 'easy' && !relax && !bigPool.includes(c)) continue
    const connectors = commonTeammates(idx, a, c)
    const [lo, hi] = relax ? [1, Infinity] : CONNECTOR_RANGE[difficulty]
    if (connectors.length >= lo && connectors.length <= hi) return { a, c, connectors }
  }
  throw new Error('Could not generate a round')
}

export type GuessResult =
  | { kind: 'invalid'; reason: string }
  | { kind: 'correct' }
  | { kind: 'wrong'; withA: boolean; withC: boolean }

export function evaluateGuess(idx: PathIndex, round: Round, guess: number): GuessResult {
  if (guess === round.a || guess === round.c) return { kind: 'invalid', reason: 'Pick someone other than the two players shown.' }
  if (round.connectors.includes(guess)) return { kind: 'correct' }
  const na = teammates(idx, round.a), nc = teammates(idx, round.c)
  return { kind: 'wrong', withA: na.has(guess), withC: nc.has(guess) }
}

export function feedbackText(r: Extract<GuessResult, { kind: 'wrong' }>, nameA: string, nameC: string): string {
  if (r.withA && !r.withC) return `Played with ${nameA}, but not with ${nameC}.`
  if (!r.withA && r.withC) return `Played with ${nameC}, but not with ${nameA}.`
  if (r.withA && r.withC) return 'Played with both — but that is not a valid link here.' // unreachable by construction; kept for safety
  return `Never played with either ${nameA} or ${nameC}.`
}
