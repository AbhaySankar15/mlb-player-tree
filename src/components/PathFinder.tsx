import type { GraphData } from '../types/graph'
import type { FoundPath } from '../lib/pathfinder'
import type { RostersState } from '../lib/useRosters'
import { formatTeamSeason } from '../lib/loadGraph'
import SearchBox from './SearchBox'

interface Props {
  data: GraphData
  a: number | null
  b: number | null
  rosters: RostersState
  found: FoundPath | null | undefined // undefined = not computed, null = not connected
  onA: (i: number | null) => void
  onB: (i: number | null) => void
  onSelectPlayer: (i: number) => void
  onRetry: () => void
}

export default function PathFinder({ data, a, b, rosters, found, onA, onB, onSelectPlayer, onRetry }: Props) {
  const nm = (i: number | null) => (i === null ? null : data.players.name[i])
  const degrees = found ? found.players.length - 1 : 0
  return (
    <section className="panel pathfinder" aria-label="Connect two players">
      <h2>Connect two players</h2>
      <div className="pf-inputs">
        <SearchBox data={data} onSelect={onA} placeholder="From: any player…" valueName={nm(a)} onClear={() => onA(null)} />
        <button className="btn small swap" onClick={() => { onA(b); onB(a) }} disabled={a === null && b === null} aria-label="Swap players" title="Swap">⇅</button>
        <SearchBox data={data} onSelect={onB} placeholder="To: any player…" valueName={nm(b)} onClear={() => onB(null)} />
      </div>
      {rosters.status === 'loading' && <p className="muted">Loading rosters…</p>}
      {rosters.status === 'error' && (
        <p className="muted" role="alert">Could not load rosters: {rosters.message} <button className="btn small" onClick={onRetry}>Retry</button></p>
      )}
      {found === null && a !== null && b !== null && (
        <p className="muted" role="status">No teammate chain connects these two players in the data.</p>
      )}
      {found && (
        <div role="status">
          <p className="pf-summary">
            {degrees === 0 ? 'Same player.' : degrees === 1 ? 'Direct teammates.' : `${degrees} degrees of separation.`}
          </p>
          <ol className="pf-path">
            {found.players.map((p, k) => (
              <li key={`${p}-${k}`}>
                <button className="trail-btn" onClick={() => onSelectPlayer(p)}>{data.players.name[p]}</button>
                {k < found.via.length && <span className="trail-via">teammates in {formatTeamSeason(data.teamSeasons[found.via[k]])}</span>}
              </li>
            ))}
          </ol>
        </div>
      )}
      {(a !== null || b !== null) && (
        <button className="btn small" onClick={() => { onA(null); onB(null) }}>Clear path</button>
      )}
    </section>
  )
}
