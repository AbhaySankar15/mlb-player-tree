/**
 * GET  /api/leaderboard?date=YYYY-MM-DD   -> { date, entries: top 50 for that daily puzzle }
 * GET  /api/leaderboard?week=YYYY-MM-DD   -> { end, entries: total points over the 7 days ending that date }
 * POST /api/leaderboard {date,name,rounds} -> { rank, score, entries }  (one score per nickname per day)
 * Storage: Upstash Redis. Per day, a sorted set (ranking) plus a hash (display names); both expire after 14 days.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import { pipeline, redisConfigured } from './_redis.js'
import {
  TOP_N, dateAcceptable, decodeScore, elapsedSince, encodeScore, isDateKey, lastDates, nameKey, roundsEmoji, validateName, validateRounds,
  type BoardEntry, type SubmitBody,
} from '../src/lib/leaderboardRules.js'

const TTL_SECONDS = 14 * 86400
const RATE_LIMIT = 20 // submissions per IP per hour
const zkey = (date: string) => `lb:z:${date}`
const hkey = (date: string) => `lb:h:${date}`

type Req = IncomingMessage & { query?: Record<string, string | string[] | undefined>; body?: unknown }

function send(res: ServerResponse, status: number, body: unknown, cacheable = false) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', cacheable ? 'public, s-maxage=10, stale-while-revalidate=30' : 'no-store')
  res.end(JSON.stringify(body))
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

async function readBody(req: Req): Promise<unknown> {
  if (req.body !== undefined) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  const chunks: Buffer[] = []
  let size = 0
  for await (const c of req) { size += (c as Buffer).length; if (size > 4096) throw new Error('too large'); chunks.push(c as Buffer) }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function pairs(flat: unknown): [string, number][] {
  const a = (flat as (string | number)[]) ?? []
  const out: [string, number][] = []
  for (let i = 0; i + 1 < a.length; i += 2) out.push([String(a[i]), Number(a[i + 1])])
  return out
}

async function topForDate(date: string, n = TOP_N): Promise<BoardEntry[]> {
  const [flat] = await pipeline([['ZREVRANGE', zkey(date), 0, n - 1, 'WITHSCORES']])
  const rows = pairs(flat)
  if (!rows.length) return []
  const [vals] = await pipeline([['HMGET', hkey(date), ...rows.map(([k]) => k)]])
  return rows.map(([k, s], i) => {
    const meta = safeJson((vals as (string | null)[])[i])
    return { name: meta?.name ?? k, score: decodeScore(s), rounds: meta?.rounds ?? '' }
  })
}

function safeJson(s: string | null): { name?: string; rounds?: string } | null {
  try { return s ? JSON.parse(s) : null } catch { return null }
}

async function weekly(end: string): Promise<BoardEntry[]> {
  const dates = lastDates(end, 7)
  const results = await pipeline(dates.map((d) => ['ZREVRANGE', zkey(d), 0, 199, 'WITHSCORES']))
  const hashes = await pipeline(dates.map((d) => ['HGETALL', hkey(d)]))
  const totals = new Map<string, { name: string; score: number; days: number }>()
  dates.forEach((_, i) => {
    const meta = hashAsObject(hashes[i])
    for (const [k, s] of pairs(results[i])) {
      const cur = totals.get(k) ?? { name: safeJson(meta[k])?.name ?? k, score: 0, days: 0 }
      cur.score += decodeScore(s); cur.days += 1
      totals.set(k, cur)
    }
  })
  return [...totals.values()]
    .sort((a, b) => b.score - a.score || b.days - a.days || a.name.localeCompare(b.name))
    .slice(0, TOP_N)
    .map((t) => ({ name: t.name, score: t.score, rounds: `${t.days} day${t.days === 1 ? '' : 's'}` }))
}

function hashAsObject(flat: unknown): Record<string, string> {
  const a = (flat as string[]) ?? []
  const o: Record<string, string> = {}
  for (let i = 0; i + 1 < a.length; i += 2) o[a[i]] = a[i + 1]
  return o
}

function clientIp(req: Req): string {
  const f = one(req.headers['x-forwarded-for'] as string | undefined)
  return (f?.split(',')[0] ?? req.socket?.remoteAddress ?? 'unknown').trim()
}

export default async function handler(req: Req, res: ServerResponse) {
  if (!redisConfigured()) return send(res, 503, { error: 'Leaderboard is not set up on this deployment.' })
  try {
    if (req.method === 'GET') {
      const url = new URL(req.url ?? '/', 'http://x')
      const date = url.searchParams.get('date'), week = url.searchParams.get('week')
      if (date) {
        if (!isDateKey(date)) return send(res, 400, { error: 'Bad date.' })
        return send(res, 200, { date, entries: await topForDate(date) }, true)
      }
      if (week) {
        if (!isDateKey(week)) return send(res, 400, { error: 'Bad date.' })
        return send(res, 200, { end: week, entries: await weekly(week) }, true)
      }
      return send(res, 400, { error: 'Pass ?date= or ?week=.' })
    }
    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return send(res, 405, { error: 'Method not allowed.' }) }

    let body: SubmitBody
    try { body = (await readBody(req)) as SubmitBody } catch { return send(res, 400, { error: 'Bad request body.' }) }
    if (!body || typeof body.name !== 'string' || !isDateKey(body.date)) return send(res, 400, { error: 'Bad request.' })
    const now = Date.now()
    if (!dateAcceptable(body.date, now)) return send(res, 400, { error: 'That daily challenge is not open for scores.' })
    const nameErr = validateName(body.name)
    if (nameErr) return send(res, 400, { error: nameErr })
    const checked = validateRounds(body.rounds)
    if ('error' in checked) return send(res, 400, { error: checked.error })

    const name = body.name.trim().replace(/\s+/g, ' ')
    const key = nameKey(name)
    const rl = `lb:rl:${clientIp(req)}`
    const [hits] = await pipeline([['INCR', rl], ['EXPIRE', rl, 3600, 'NX']])
    if (Number(hits) > RATE_LIMIT) return send(res, 429, { error: 'Too many submissions. Try again later.' })

    const z = zkey(body.date), h = hkey(body.date)
    const [claimed] = await pipeline([['HSETNX', h, key, JSON.stringify({ name, rounds: roundsEmoji(body.rounds) })]])
    if (Number(claimed) !== 1) return send(res, 409, { error: 'That nickname already has a score for this day.' })
    await pipeline([
      ['ZADD', z, encodeScore(checked.total, elapsedSince(body.date, now)), key],
      ['EXPIRE', z, TTL_SECONDS], ['EXPIRE', h, TTL_SECONDS],
    ])
    const [rank] = await pipeline([['ZREVRANK', z, key]])
    return send(res, 200, { rank: Number(rank) + 1, score: checked.total, entries: await topForDate(body.date) })
  } catch (e) {
    console.error('leaderboard error', e)
    return send(res, 502, { error: 'Leaderboard is temporarily unavailable.' })
  }
}
