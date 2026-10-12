import type { GraphData } from '../types/graph'
import { formatTeamSeason, getPlayer } from '../lib/loadGraph'

const fmt = (n: number) => n.toLocaleString('en-US')

export function InfoPanel({ data }: { data: GraphData }) {
  const m = data.meta
  return (
    <section className="panel">
      <h2>About this graph</h2>
      <dl>
        <dt>Total players</dt><dd>{fmt(m.totalPlayers)}</dd>
        <dt>Root player</dt><dd>{m.rootName}</dd>
        <dt>Root unique career teammates</dt><dd>{fmt(m.rootTeammateCount)}</dd>
        <dt>Connected components</dt><dd>{fmt(m.componentCount)}</dd>
        <dt>Max degrees of separation</dt><dd>{m.maximumSeparation}</dd>
        <dt>Dataset coverage</dt><dd>{m.dataCoverageStart}–{m.dataCoverageEnd}</dd>
        <dt>Source version</dt><dd>{m.sourceVersion}</dd>
      </dl>
      <p className="note">
        Two players are connected when they appeared for the same team in the same season (team-season overlap), not necessarily the same game.
      </p>
      <p className="note attribution">
        Data: SABR Lahman Baseball Database (CC BY-SA 3.0); Negro Leagues data licensed from Seamheads.com
      </p>
    </section>
  )
}

export default function PlayerPanel({ data, selected, onClose }: { data: GraphData; selected: number; onClose: () => void }) {
  const p = getPlayer(data, selected)
  const parentName = p.parent >= 0 ? data.players.name[p.parent] : null
  const ts = p.evidence >= 0 ? formatTeamSeason(data.teamSeasons[p.evidence]) : ''
  return (
    <section className="panel selected">
      <div className="panel-head">
        <h2>{p.name}</h2>
        <button className="btn small" onClick={onClose} aria-label="Deselect">Deselect</button>
      </div>
      <dl>
        <dt>Player ID</dt><dd>{p.id}</dd>
        <dt>Degrees of separation</dt><dd>{p.depth}</dd>
        <dt>Unique career teammates</dt><dd>{fmt(p.degree)}</dd>
        <dt>Career years</dt><dd>{p.debut}–{p.final}</dd>
        <dt>Leagues</dt><dd>{p.leagues.replace(/,/g, ', ')}</dd>
        <dt>Team-seasons</dt><dd>{p.seasons}</dd>
        <dt>Connecting teammate</dt><dd>{parentName ?? 'None (root)'}</dd>
        {ts && (<><dt>Shared team-season</dt><dd>{ts}</dd></>)}
      </dl>
    </section>
  )
}
