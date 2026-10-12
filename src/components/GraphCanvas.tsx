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
  onSelect: (index: number | null) => void
}

const GraphCanvas = forwardRef<GraphCanvasHandle, Props>(function GraphCanvas({ data, selected, focusDepth, onSelect }, ref) {
  const container = useRef<HTMLDivElement>(null)
  const sigmaRef = useRef<Sigma | null>(null)
  const state = useRef<{ selected: number | null; focusDepth: number | null; zoomedOut: boolean; nodes: Set<string>; edges: Set<string> }>({
    selected: null, focusDepth: null, zoomedOut: true, nodes: new Set(), edges: new Set(),
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
      zoomToSizeRatioFunction: (ratio) => Math.pow(ratio, 0.75),
      minCameraRatio: 0.005,
      maxCameraRatio: 3,
      nodeReducer: (node, attrs) => {
        const st = state.current
        const isRoot = node === String(data.meta.rootIndex)
        if (st.selected === null) {
          if (st.focusDepth === null) return isRoot ? { ...attrs, forceLabel: true } : attrs
          if (attrs.depth === st.focusDepth) return { ...attrs, size: Math.max(attrs.size * 1.6, 2.5), zIndex: 2 }
          return isRoot ? { ...attrs, forceLabel: true } : { ...attrs, color: FOCUS_DIM_NODE, label: null, zIndex: 0 }
        }
        if (st.nodes.has(node)) {
          const isSel = node === String(st.selected)
          return { ...attrs, size: isSel ? 12 : Math.max(attrs.size * 1.8, 4), color: isSel ? '#ffffff' : attrs.color,
            forceLabel: true, zIndex: isSel ? 3 : 2, highlighted: isSel }
        }
        return { ...attrs, color: DIM_NODE, label: null, zIndex: 0 }
      },
      edgeReducer: (edge, attrs) => {
        const st = state.current
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
