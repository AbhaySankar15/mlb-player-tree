import { useCallback, useEffect, useState } from 'react'
import { fetchDaily, fetchWeek, type BoardEntry } from '../lib/leaderboardApi'
import { nameKey } from '../lib/leaderboardRules'

type State = { kind: 'loading' } | { kind: 'error'; message: string; unconfigured: boolean } | { kind: 'ready'; entries: BoardEntry[] }

/** Global daily leaderboard (today's puzzle) with a 7-day totals tab. `refreshKey` re-fetches after a score is submitted. */
export default function Leaderboard({ date, me, refreshKey = 0 }: { date: string; me: string; refreshKey?: number }) {
  const [tab, setTab] = useState<'day' | 'week'>('day')
  const [state, setState] = useState<State>({ kind: 'loading' })

  const load = useCallback(async () => {
    setState({ kind: 'loading' })
    const r = tab === 'day' ? await fetchDaily(date) : await fetchWeek(date)
    setState(r.ok ? { kind: 'ready', entries: r.data.entries } : { kind: 'error', message: r.message, unconfigured: r.status === 503 || r.status === 404 })
  }, [tab, date])

  useEffect(() => { void load() }, [load, refreshKey])
  const mine = me ? nameKey(me) : ''

  return (
    <section className="lb" aria-label="Global leaderboard">
      <div className="lb-head">
        <h3 className="mini-h">Global leaderboard</h3>
        <div className="lb-tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'day'} className={tab === 'day' ? 'on' : ''} onClick={() => setTab('day')}>Daily {date}</button>
          <button role="tab" aria-selected={tab === 'week'} className={tab === 'week' ? 'on' : ''} onClick={() => setTab('week')}>Past 7 days</button>
        </div>
      </div>
      {state.kind === 'loading' && <div className="lb-note" role="status"><div className="spinner small" />Loading…</div>}
      {state.kind === 'error' && (
        <div className="lb-note" role="alert">
          {state.unconfigured ? 'The online leaderboard is not switched on for this site yet.' : state.message}{' '}
          {!state.unconfigured && <button className="btn small" onClick={load}>Retry</button>}
        </div>
      )}
      {state.kind === 'ready' && state.entries.length === 0 && <div className="lb-note">No scores yet. Be the first to play today&rsquo;s challenge!</div>}
      {state.kind === 'ready' && state.entries.length > 0 && (
        <ol className="lb-list">
          {state.entries.map((e, i) => (
            <li key={`${e.name}-${i}`} className={mine && nameKey(e.name) === mine ? 'me' : ''}>
              <span className="lb-rank">{i + 1}</span>
              <span className="lb-name">{e.name}</span>
              <span className="lb-rounds">{e.rounds}</span>
              <span className="lb-score">{e.score}{tab === 'day' ? '/15' : ' pts'}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
