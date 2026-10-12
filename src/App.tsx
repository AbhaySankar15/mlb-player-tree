import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import GraphCanvas, { type GraphCanvasHandle } from './components/GraphCanvas'
import Header from './components/Header'
import ProfileDrawer from './components/ProfileDrawer'
import SearchBox from './components/SearchBox'
import GraphLegend from './components/GraphLegend'
import PlayerPanel, { InfoPanel } from './components/PlayerPanel'
import PathFinder from './components/PathFinder'
import { findPath } from './lib/pathfinder'
import { useRosters } from './lib/useRosters'
import { loadGraph } from './lib/loadGraph'
import type { GraphData } from './types/graph'

export default function App() {
  const [data, setData] = useState<GraphData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [pfA, setPfA] = useState<number | null>(null)
  const [pfB, setPfB] = useState<number | null>(null)
  const [rosterRetry, setRosterRetry] = useState(0)
  const [focusDepth, setFocusDepth] = useState<number | null>(null)
  const canvas = useRef<GraphCanvasHandle>(null)

  const load = useCallback(() => {
    setError(null)
    setData(null)
    loadGraph().then(setData).catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [])
  useEffect(load, [load])

  const rosters = useRosters(pfA !== null || pfB !== null, data?.count ?? 0, rosterRetry)
  const found = useMemo(
    () => (rosters.status === 'ready' && pfA !== null && pfB !== null ? findPath(rosters.index, pfA, pfB) : undefined),
    [rosters, pfA, pfB],
  )

  return (
    <div className="app">
      {data && <GraphCanvas ref={canvas} data={data} selected={selected} focusDepth={focusDepth} pathPlayers={found ? found.players : null} onSelect={setSelected} />}
      <Header />
      {!data && !error && (
        <div className="overlay" role="status"><div className="spinner" />Loading players…</div>
      )}
      {error && (
        <div className="overlay" role="alert">
          <p>Could not load graph data.</p>
          <p className="muted">{error}</p>
          <button className="btn" onClick={load}>Retry</button>
        </div>
      )}
      {data && (
        <>
          <aside className="sidebar">
            <SearchBox data={data} onSelect={setSelected} hotkey />
            <div className="toolbar">
              <button className="btn" onClick={() => canvas.current?.fit()}>Fit graph</button>
              <button className="btn" onClick={() => canvas.current?.resetToRoot()}>Reset to center (root)</button>
            </div>
            {selected !== null && <PlayerPanel data={data} selected={selected} onClose={() => setSelected(null)} onSelect={setSelected} onOpenProfile={() => setProfileOpen(true)} onPathFrom={() => setPfA(selected)} onPathTo={() => setPfB(selected)} />}
            <PathFinder
              data={data} a={pfA} b={pfB} rosters={rosters} found={found} onA={setPfA} onB={setPfB}
              onSelectPlayer={setSelected} onRetry={() => setRosterRetry((n) => n + 1)}
            />
            <InfoPanel data={data} />
          </aside>
          {selected !== null && profileOpen && (
            <ProfileDrawer data={data} selected={selected} onClose={() => setProfileOpen(false)} />
          )}
          <GraphLegend maxDepth={data.meta.maximumSeparation} focusDepth={focusDepth} onFocus={setFocusDepth} />
        </>
      )}
    </div>
  )
}
