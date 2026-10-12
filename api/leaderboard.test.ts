import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ServerResponse } from 'node:http'
import handler from './leaderboard'

/** In-memory stand-in for the Upstash REST pipeline endpoint (only the commands the handler uses). */
function fakeRedis() {
  const strings = new Map<string, number>(), hashes = new Map<string, Map<string, string>>(), zsets = new Map<string, Map<string, number>>()
  const run = ([cmd, key, ...a]: (string | number)[]): unknown => {
    const k = String(key)
    switch (cmd) {
      case 'INCR': { const n = (strings.get(k) ?? 0) + 1; strings.set(k, n); return n }
      case 'EXPIRE': return 1
      case 'HSETNX': { const h = hashes.get(k) ?? new Map(); hashes.set(k, h); if (h.has(String(a[0]))) return 0; h.set(String(a[0]), String(a[1])); return 1 }
      case 'ZADD': { const z = zsets.get(k) ?? new Map(); zsets.set(k, z); z.set(String(a[1]), Number(a[0])); return 1 }
      case 'ZREVRANGE': {
        const sorted = [...(zsets.get(k) ?? new Map<string, number>())].sort((x, y) => y[1] - x[1])
        return sorted.slice(Number(a[0]), Number(a[1]) + 1).flatMap(([m, s]) => [m, String(s)])
      }
      case 'ZREVRANK': return [...(zsets.get(k) ?? new Map<string, number>())].sort((x, y) => y[1] - x[1]).findIndex(([m]) => m === a[0])
      case 'HMGET': return a.map((f) => hashes.get(k)?.get(String(f)) ?? null)
      case 'HGETALL': return [...(hashes.get(k) ?? new Map())].flat()
      default: throw new Error(`unsupported ${cmd}`)
    }
  }
  return vi.fn(async (_url: string, init: RequestInit) => ({
    ok: true, status: 200, json: async () => (JSON.parse(String(init.body)) as (string | number)[][]).map((c) => ({ result: run(c) })),
  }))
}

function call(method: string, url: string, body?: unknown, ip = '1.1.1.1') {
  const headers: Record<string, string> = {}
  const res = { statusCode: 0, setHeader: (k: string, v: string) => { headers[k.toLowerCase()] = v }, end: (s: string) => { out.body = JSON.parse(s) } } as unknown as ServerResponse
  const out: { body?: any; res: ServerResponse; headers: Record<string, string> } = { res, headers }
  const req = { method, url, body, headers: { 'x-forwarded-for': ip }, socket: {} } as never
  return handler(req, res).then(() => ({ status: res.statusCode, body: out.body, headers }))
}

const today = () => new Date().toISOString().slice(0, 10)
const rounds = (pts: number[]) => pts.map((points) => ({ solved: points > 0, points, wrong: points > 0 ? 3 - points : 0, hints: 0 }))

beforeEach(() => {
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.test'; process.env.UPSTASH_REDIS_REST_TOKEN = 't'
  vi.stubGlobal('fetch', fakeRedis())
})
afterEach(() => { vi.unstubAllGlobals(); delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN })

describe('/api/leaderboard', () => {
  it('reports 503 when storage is not configured', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    expect((await call('GET', `/api/leaderboard?date=${today()}`)).status).toBe(503)
  })

  it('accepts a score, ranks it and shows it to the next visitor', async () => {
    const d = today()
    const a = await call('POST', '/api/leaderboard', { date: d, name: 'Sandlot Sam', rounds: rounds([3, 3, 2, 2, 1]) })
    expect(a.status).toBe(200)
    expect(a.body.rank).toBe(1)
    expect(a.headers['cache-control']).toBe('no-store')
    await call('POST', '/api/leaderboard', { date: d, name: 'Bleacher Bob', rounds: rounds([3, 3, 3, 3, 3]) }, '2.2.2.2')
    const board = await call('GET', `/api/leaderboard?date=${d}`, undefined, '3.3.3.3')
    expect(board.status).toBe(200)
    expect(board.body.entries.map((e: any) => [e.name, e.score])).toEqual([['Bleacher Bob', 15], ['Sandlot Sam', 11]])
    expect(board.headers['cache-control']).toContain('s-maxage')
  })

  it('breaks ties in favour of the earlier submission', async () => {
    const d = today()
    await call('POST', '/api/leaderboard', { date: d, name: 'First', rounds: rounds([3, 3, 3, 0, 0]) })
    await call('POST', '/api/leaderboard', { date: d, name: 'Second', rounds: rounds([3, 3, 3, 0, 0]) }, '9.9.9.9')
    const b = await call('GET', `/api/leaderboard?date=${d}`)
    expect(b.body.entries.map((e: any) => e.name)).toEqual(['First', 'Second'])
  })

  it('allows one score per nickname per day, case-insensitively', async () => {
    const d = today()
    expect((await call('POST', '/api/leaderboard', { date: d, name: 'Sam', rounds: rounds([3, 3, 3, 3, 3]) })).status).toBe(200)
    const dup = await call('POST', '/api/leaderboard', { date: d, name: ' sam ', rounds: rounds([0, 0, 0, 0, 0]) })
    expect(dup.status).toBe(409)
    const b = await call('GET', `/api/leaderboard?date=${d}`)
    expect(b.body.entries).toHaveLength(1)
    expect(b.body.entries[0].score).toBe(15)
  })

  it('rejects bad names, forged scores, and out-of-window dates', async () => {
    const d = today()
    expect((await call('POST', '/api/leaderboard', { date: d, name: 'ab', rounds: rounds([3, 3, 3, 3, 3]) })).status).toBe(400)
    expect((await call('POST', '/api/leaderboard', { date: d, name: 'sh1t head', rounds: rounds([3, 3, 3, 3, 3]) })).status).toBe(400)
    const forged = rounds([3, 3, 3, 3, 3]).map((r, i) => (i === 0 ? { ...r, points: 9 } : r))
    expect((await call('POST', '/api/leaderboard', { date: d, name: 'Cheater', rounds: forged })).status).toBe(400)
    expect((await call('POST', '/api/leaderboard', { date: '2020-01-01', name: 'Oldtimer', rounds: rounds([3, 3, 3, 3, 3]) })).status).toBe(400)
    expect((await call('POST', '/api/leaderboard', 'not json{')).status).toBe(400)
    expect((await call('GET', `/api/leaderboard?date=garbage`)).status).toBe(400)
    expect((await call('DELETE', '/api/leaderboard')).status).toBe(405)
  })

  it('rate limits a single address', async () => {
    const d = today()
    let last = 0
    for (let i = 0; i < 22; i++) last = (await call('POST', '/api/leaderboard', { date: d, name: `Player ${i}`, rounds: rounds([1, 1, 1, 1, 1]) }, '5.5.5.5')).status
    expect(last).toBe(429)
  })

  it('totals the last seven days on the weekly board', async () => {
    const d = today()
    const y = new Date(Date.parse(`${d}T00:00:00Z`) - 86400000).toISOString().slice(0, 10)
    await call('POST', '/api/leaderboard', { date: d, name: 'Sam', rounds: rounds([3, 3, 3, 0, 0]) })
    await call('POST', '/api/leaderboard', { date: y, name: 'Sam', rounds: rounds([2, 2, 0, 0, 0]) }, '7.7.7.7')
    await call('POST', '/api/leaderboard', { date: d, name: 'Rival', rounds: rounds([3, 3, 3, 3, 0]) }, '8.8.8.8')
    const w = await call('GET', `/api/leaderboard?week=${d}`)
    expect(w.body.entries.map((e: any) => [e.name, e.score, e.rounds])).toEqual([['Rival', 12, '1 day'], ['Sam', 13, '2 days']].sort((p, q) => (q[1] as number) - (p[1] as number)))
  })
})
