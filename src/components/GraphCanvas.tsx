import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import Graph from 'graphology'
import Sigma from 'sigma'
import type { GraphData } from '../types/graph'
import { pathToRoot } from '../lib/pathToRoot'
import { DIM_NODE, EDGE_DIM, FOCUS_DIM_NODE, PATH_COLOR, ROOT_COLOR, depthColor, edgeColor, edgeColorFocused, nodeSize } from '../lib/colors'

export interface GraphCanvasHandle {
  fit: () => void
  resetToRoot: () => void
}

/** Edges to nodes at this depth or deeper are hidden while the camera is zoomed out (unless on the selected path). */
const DEEP_EDGE_DEPTH = 3
const ZOOM_REVEAL_RATIO = 0.35

interface Props {
  data: GraphData
  selected: number | null
  focusDepth: number | null
  /** Connection path (player indices) from the path finder, drawn above everything else. */
  pathPlayers: number[] | null
  onSelect: (index: number | null) => void
}

const GraphCanvas = forwardRef<GraphCanvasHandle, Props>(function GraphCanvas({ data, selected, focusDepth, pathPlayers, onSelect }, ref) {
  const container = useRef<HTMLDivElement>(null)
  const sigmaRef = useRef<Sigma | null>(null)
  const state = useRef<{ selected: number | null; focusDepth: number | null; zoomedOut: boolean; pfNodes: Set<string>; pfEdges: Set<string>; nodes: Set<string>; edges: Set<string> }>({
    selected: null, focusDepth: null, zoomedOut: true, pfNodes: new Set(), pfEdges: new Set(), nodes: new Set(), edges: new Set(),
  })
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  useImperativeHandle(ref, () => ({
    fit: () => sigmaRef.current?.getCamera().animatedReset({ duration: 900, easing: 'cubicInOut' }),
    resetToRoot: () => {
      const s = sigmaRef.current
      if (!s) return
      const d = s.getNodeDisplayData(String(data.meta.rootIndex))
      if (d) s.getCamera().animate({ x: d.x, y: d.y, ratio: 0.12, angle: 0 }, { duration: 900, easing: 'cubicInOut' })
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
        size: nodeSize(p.depth[i]), depth: p.depth[i],
        color: i === data.meta.rootIndex ? ROOT_COLOR : depthColor(p.depth[i]),
      })
    }
    for (let i = 0; i < data.count; i++) {
      if (p.parent[i] >= 0) graph.addEdgeWithKey(`e${i}`, String(p.parent[i]), String(i), { size: 0.4, color: edgeColor(p.depth[i]), depth: p.depth[i] })
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
      hideEdgesOnMove: true,
      hideLabelsOnMove: window.matchMedia?.('(pointer: coarse)').matches ?? false,
      // Node size scales 1:1 with the layout, so lanes stay distinct instead of fusing into slabs when zooming in.
      zoomToSizeRatioFunction: (ratio) => ratio,
      minCameraRatio: 0.01,
      maxCameraRatio: 3,
      nodeReducer: (node, attrs) => {
        const st = state.current
        const isRoot = node === String(data.meta.rootIndex)
        if (st.pfNodes.size) {
          if (st.pfNodes.has(node)) return { ...attrs, size: 6, color: '#ffd23f', forceLabel: true, zIndex: 3 }
          return { ...attrs, color: DIM_NODE, label: null, zIndex: 0 }
        }
        if (st.selected === null) {
          if (st.focusDepth === null) return isRoot ? { ...attrs, forceLabel: true } : attrs
          if (attrs.depth === st.focusDepth) return { ...attrs, size: Math.max(attrs.size * 1.6, 2.5), zIndex: 2 }
          return isRoot ? { ...attrs, forceLabel: true } : { ...attrs, color: FOCUS_DIM_NODE, label: null, zIndex: 0 }
        }
        if (st.nodes.has(node)) {
          const isSel = node === String(st.selected)
          return { ...attrs, size: isSel ? 8 : Math.max(attrs.size * 1.6, 3), color: isSel ? '#ffffff' : attrs.color,
            forceLabel: true, zIndex: isSel ? 3 : 2, highlighted: isSel }
        }
        return { ...attrs, color: DIM_NODE, label: null, zIndex: 0 }
      },
      edgeReducer: (edge, attrs) => {
        const st = state.current
        if (st.pfEdges.size) {
          return st.pfEdges.has(edge) ? { ...attrs, color: '#ffd23f', size: 4, zIndex: 3, hidden: false } : { ...attrs, color: EDGE_DIM, hidden: st.zoomedOut && attrs.depth >= DEEP_EDGE_DEPTH }
        }
        const deepHidden = st.zoomedOut && attrs.depth >= DEEP_EDGE_DEPTH
        if (st.selected === null) {
          if (st.focusDepth === null) return deepHidden ? { ...attrs, hidden: true } : attrs
          if (attrs.depth === st.focusDepth) return { ...attrs, color: edgeColorFocused(attrs.depth), zIndex: 1 }
          return deepHidden ? { ...attrs, hidden: true } : { ...attrs, color: EDGE_DIM }
        }
        if (st.edges.has(edge)) return { ...attrs, color: PATH_COLOR, size: 3, zIndex: 2 }
        return deepHidden ? { ...attrs, hidden: true } : { ...attrs, color: EDGE_DIM, zIndex: 0 }
      },
    })
    sigmaRef.current = sigma

    sigma.on('clickNode', ({ node }) => onSelectRef.current(Number(node)))
    sigma.on('clickStage', () => onSelectRef.current(null))
    sigma.on('enterNode', () => { if (container.current) container.current.style.cursor = 'pointer' })
    sigma.on('leaveNode', () => { if (container.current) container.current.style.cursor = '' })
    // Intro: start slightly zoomed out and ease into the fitted view.
    const cam = sigma.getCamera()
    cam.on('updated', ({ ratio }) => {
      const out = ratio > ZOOM_REVEAL_RATIO
      if (out !== state.current.zoomedOut) { state.current.zoomedOut = out; sigma.refresh() }
    })
    cam.setState({ ...cam.getState(), ratio: 1.8 })
    cam.animate({ ratio: 1 }, { duration: 1400, easing: 'cubicOut' })

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
    const sigma = sigmaRef.current
    sigma?.refresh()
    if (sigma && selected !== null) {
      const d = sigma.getNodeDisplayData(String(selected))
      const cam = sigma.getCamera()
      if (d) cam.animate({ x: d.x, y: d.y, ratio: Math.min(cam.getState().ratio, 0.2) }, { duration: 800, easing: 'cubicInOut' })
    }
  }, [selected, data])

  // Path-finder overlay: add temporary edges (only where no tree edge exists), highlight, and frame the path.
  useEffect(() => {
    const sigma = sigmaRef.current
    if (!sigma) return
    const graph = sigma.getGraph()
    const added: string[] = []
    const st = state.current
    st.pfNodes = new Set(); st.pfEdges = new Set()
    if (pathPlayers && pathPlayers.length > 0) {
      pathPlayers.forEach((p) => st.pfNodes.add(String(p)))
      for (let k = 0; k + 1 < pathPlayers.length; k++) {
        const a = String(pathPlayers[k]), b = String(pathPlayers[k + 1])
        let key = graph.edge(a, b)
        if (!key) { key = `pf${k}`; graph.addEdgeWithKey(key, a, b, { size: 4, color: '#ffd23f', depth: 0 }); added.push(key) }
        st.pfEdges.add(key)
      }
      const pts = pathPlayers.map((p) => sigma.getNodeDisplayData(String(p))).filter((d): d is NonNullable<typeof d> => !!d)
      if (pts.length) {
        const xs = pts.map((d) => d.x), ys = pts.map((d) => d.y)
        const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))
        sigma.getCamera().animate(
          { x: (Math.max(...xs) + Math.min(...xs)) / 2, y: (Math.max(...ys) + Math.min(...ys)) / 2, ratio: Math.min(1, Math.max(0.03, span * 1.5 + 0.02)) },
          { duration: 900, easing: 'cubicInOut' },
        )
      }
    }
    sigma.refresh()
    return () => { added.forEach((k) => { if (graph.hasEdge(k)) graph.dropEdge(k) }) }
  }, [pathPlayers, data])

  useEffect(() => {
    state.current.focusDepth = focusDepth
    sigmaRef.current?.refresh()
  }, [focusDepth])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onSelectRef.current(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return <div ref={container} className="graph-canvas" />
})

export default GraphCanvas
