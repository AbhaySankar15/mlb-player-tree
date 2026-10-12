import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import Graph from 'graphology'
import Sigma from 'sigma'
import type { GraphData } from '../types/graph'
import { pathToRoot } from '../lib/pathToRoot'
import { DIM_NODE, EDGE_COLOR, EDGE_DIM, PATH_COLOR, ROOT_COLOR, depthColor, nodeSize } from '../lib/colors'

export interface GraphCanvasHandle {
  fit: () => void
  resetToRoot: () => void
}

interface Props {
  data: GraphData
  selected: number | null
  onSelect: (index: number | null) => void
}

const GraphCanvas = forwardRef<GraphCanvasHandle, Props>(function GraphCanvas({ data, selected, onSelect }, ref) {
  const container = useRef<HTMLDivElement>(null)
  const sigmaRef = useRef<Sigma | null>(null)
  const state = useRef<{ selected: number | null; nodes: Set<string>; edges: Set<string> }>({
    selected: null, nodes: new Set(), edges: new Set(),
  })
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  useImperativeHandle(ref, () => ({
    fit: () => sigmaRef.current?.getCamera().animatedReset({ duration: 600 }),
    resetToRoot: () => {
      const s = sigmaRef.current
      if (!s) return
      const d = s.getNodeDisplayData(String(data.meta.rootIndex))
      if (d) s.getCamera().animate({ x: d.x, y: d.y, ratio: 0.12, angle: 0 }, { duration: 700 })
    },
  }), [data])

  // Build graph + sigma once per dataset.
  useEffect(() => {
    if (!container.current) return
    const p = data.players
    const graph = new Graph({ type: 'undirected', multi: false })
    for (let i = 0; i < data.count; i++) {
      graph.addNode(String(i), {
        x: p.x[i], y: p.y[i], label: p.name[i],
        size: nodeSize(p.depth[i]),
        color: i === data.meta.rootIndex ? ROOT_COLOR : depthColor(p.depth[i]),
      })
    }
    for (let i = 0; i < data.count; i++) {
      if (p.parent[i] >= 0) graph.addEdgeWithKey(`e${i}`, String(p.parent[i]), String(i), { size: 0.5, color: EDGE_COLOR })
    }

    const sigma = new Sigma(graph, container.current, {
      renderEdgeLabels: false,
      labelRenderedSizeThreshold: 9,
      labelDensity: 0.6,
      labelGridCellSize: 120,
      labelColor: { color: '#e8ecff' },
      labelFont: 'Inter, system-ui, sans-serif',
      defaultDrawNodeHover: (ctx, d, settings) => {
        const size = settings.labelSize
        ctx.font = `600 ${size}px ${settings.labelFont}`
        const w = ctx.measureText(d.label || '').width
        ctx.fillStyle = '#0b1020'
        ctx.strokeStyle = '#ffd23f'
        ctx.beginPath()
        ctx.roundRect(d.x + d.size + 4, d.y - size / 2 - 4, w + 12, size + 8, 4)
        ctx.fill(); ctx.stroke()
        ctx.fillStyle = '#fff'
        ctx.fillText(d.label || '', d.x + d.size + 10, d.y + size / 3)
      },
      zIndex: true,
      minCameraRatio: 0.005,
      maxCameraRatio: 3,
      nodeReducer: (node, attrs) => {
        const st = state.current
        if (st.selected === null) return attrs
        if (st.nodes.has(node)) {
          const isSel = node === String(st.selected)
          return { ...attrs, size: isSel ? 12 : Math.max(attrs.size * 1.8, 4), color: isSel ? '#ffffff' : attrs.color,
            forceLabel: true, zIndex: isSel ? 3 : 2, highlighted: isSel }
        }
        return { ...attrs, color: DIM_NODE, label: null, zIndex: 0 }
      },
      edgeReducer: (edge, attrs) => {
        const st = state.current
        if (st.selected === null) return attrs
        if (st.edges.has(edge)) return { ...attrs, color: PATH_COLOR, size: 3, zIndex: 2 }
        return { ...attrs, color: EDGE_DIM, zIndex: 0 }
      },
    })
    sigmaRef.current = sigma

    sigma.on('clickNode', ({ node }) => onSelectRef.current(Number(node)))
    sigma.on('clickStage', () => onSelectRef.current(null))
    sigma.getCamera().setState({ ...sigma.getCamera().getState(), ratio: 1 })

    if (import.meta.env.DEV || new URLSearchParams(location.search).has('debug')) {
      ;(window as unknown as Record<string, unknown>).__mlbTree = { sigma, graph }
    }
    return () => {
      sigma.kill()
      sigmaRef.current = null
    }
  }, [data])

  // Selection changes: update reducer state and refresh only.
  useEffect(() => {
    const st = state.current
    st.selected = selected
    st.nodes = new Set()
    st.edges = new Set()
    if (selected !== null) {
      const path = pathToRoot(data.players.parent, selected)
      path.forEach((i, k) => {
        st.nodes.add(String(i))
        if (k > 0) st.edges.add(`e${path[k - 1]}`)
      })
    }
    sigmaRef.current?.refresh()
  }, [selected, data])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onSelectRef.current(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return <div ref={container} className="graph-canvas" />
})

export default GraphCanvas
