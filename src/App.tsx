import { useCallback, useEffect, useRef, useState } from 'react'
import GraphCanvas, { type GraphCanvasHandle } from './components/GraphCanvas'
import Header from './components/Header'
import GraphLegend from './components/GraphLegend'
import PlayerPanel, { InfoPanel } from './components/PlayerPanel'
import { loadGraph } from './lib/loadGraph'
import type { GraphData } from './types/graph'

export default function App() {
  const [data, setData] = useState<GraphData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [focusDepth, setFocusDepth] = useState<number | null>(null)
  const canvas = useRef<GraphCanvasHandle>(null)

  const load = useCallback(() => {
    setError(null)
    setData(null)
    loadGraph().then(setData).catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [])
  useEffect(load, [load])

  return (
    <div className="app">
      {data && <GraphCanvas ref={canvas} data={data} selected={selected} focusDepth={focusDepth} onSelect={setSelected} />}
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
            <div className="toolbar">
              <button className="btn" onClick={() => canvas.current?.fit()}>Fit graph</button>
              <button className="btn" onClick={() => canvas.current?.resetToRoot()}>Reset to center (root)</button>
            </div>
            {selected !== null && <PlayerPanel data={data} selected={selected} onClose={() => setSelected(null)} onSelect={setSelected} />}
            <InfoPanel data={data} />
          </aside>
          <GraphLegend maxDepth={data.meta.maximumSeparation} focusDepth={focusDepth} onFocus={setFocusDepth} />
        </>
      )}
    </div>
  )
}
