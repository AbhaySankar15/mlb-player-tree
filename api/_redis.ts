/** Minimal Upstash Redis REST client (fetch only, no dependencies). Works with the Upstash or the Vercel KV env names. */
export type Cmd = (string | number)[]

function creds(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN
  return url && token ? { url: url.replace(/\/$/, ''), token } : null
}

export const redisConfigured = (): boolean => creds() !== null

/** Runs commands as one pipeline; returns each command's result, in order. */
export async function pipeline(cmds: Cmd[]): Promise<unknown[]> {
  const c = creds()
  if (!c) throw new Error('Leaderboard storage is not configured.')
  const res = await fetch(`${c.url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${c.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds),
  })
  if (!res.ok) throw new Error(`Storage error ${res.status}`)
  const out = (await res.json()) as { result?: unknown; error?: string }[]
  const bad = out.find((o) => o.error)
  if (bad) throw new Error(bad.error)
  return out.map((o) => o.result)
}
