import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import Graph from 'graphology'
import Sigma from 'sigma'
import type { GraphData } from '../types/graph'
import { pathToRoot } from '../lib/pathToRoot'
import { COARSE_CELL, FINE_CELL, buildClusters, clusterRadius, detailFor, type Detail } from '../lib/clusters'
import { DIM_NODE, EDGE_DIM, FOCUS_DIM_NODE, PATH_COLOR, ROOT_COLOR, depthColor, edgeColor, edgeColorFocused, nodeSize } from '../lib/colors'

/** Camera animation length; 0 when the user prefers reduced motion. */
const dur = (ms: number) => (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : ms)

export interface GraphCanvasHandle {
  fit: () => void
  resetToRoot: () => void
}

const CLUSTER_PREFIX = 'c'
/** Classic view only: links to nodes this deep are hidden while zoomed out. */
const DEEP_EDGE_DEPTH = 3
const ZOOM_REVEAL_RATIO = 0.35
/** Camera ratio to zoom to when a bubble is clicked: just inside the next detail level. */
const ZOOM_INTO: Record<'coarse' | 'fine', number> = { coarse: 0.45, fine: 0.18 }

interface Props {
  data: GraphData
  selected: number | null
  focusDepth: number | null
  /** Classic view: every dot and every link at all zoom levels. */
  classic: boolean
  /** Connection path (player indices) from the path finder, drawn above everything else. */
  pathPlayers: number[] | null
  onSelect: (index: number | null) => void
}

const GraphCanvas = forwardRef<GraphCanvasHandle, Props>(function GraphCanvas({ data, selected, focusDepth, classic, pathPlayers, onSelect }, ref) {
  const container = useRef<HTMLDivElement>(null)
  const sigmaRef = useRef<Sigma | null>(null)
  const state = useRef<{ selected: number | null; focusDepth: number | null; classic: boolean; ratio: number; hover: string | null; pfNodes: Set<string>; pfEdges: Set<string>; nodes: Set<string>; edges: Set<string>; hoverEdges: Set<string> }>({
    selected: null, focusDepth: null, classic: false, ratio: 1, hover: null, pfNodes: new Set(), pfEdges: new Set(), nodes: new Set(), edges: new Set(), hoverEdges: new Set(),
  })
  /** Detail level in effect: classic mode and the legend's layer isolation always use individual dots. */
  const detailNow = (): Detail => (state.current.classic || state.current.focusDepth !== null ? 'full' : detailFor(state.current.ratio))
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  useImperativeHandle(ref, () => ({
    fit: () => sigmaRef.current?.getCamera().animatedReset({ duration: dur(900), easing: 'cubicInOut' }),
    resetToRoot: () => {
      const s = sigmaRef.current
      if (!s) return
      const d = s.getNodeDisplayData(String(data.meta.rootIndex))
      if (d) s.getCamera().animate({ x: d.x, y: d.y, ratio: 0.12, angle: 0 }, { duration: dur(900), easing: 'cubicInOut' })
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

    // Level-of-detail bubbles (one per occupied grid cell), shown instead of the 24k dots when zoomed out.
    const levels: [number, string][] = [[COARSE_CELL, 'coarse'], [FINE_CELL, 'fine']]
    for (const [cell, level] of levels) {
      const cs = buildClusters(p.x, p.y, p.depth, cell, data.meta.maximumSeparation)
      const maxCount = cs.reduce((m, c) => Math.max(m, c.count), 1)
      cs.forEach((c, k) => graph.addNode(`${CLUSTER_PREFIX}${level}_${k}`, {
        x: c.x, y: c.y, size: clusterRadius(c.count, maxCount, cell), color: depthColor(c.depth), depth: c.depth,
        cluster: level, count: c.count, label: `${c.count.toLocaleString()} player${c.count === 1 ? '' : 's'} (mostly ${c.depth === 0 ? 'the center' : `${c.depth} degree${c.depth === 1 ? '' : 's'} out`}). Click to zoom in`,
      }))
    }
    // Tree neighbours of each player, for showing a hovered player's own links.
    const childHead = new Int32Array(data.count).fill(-1), childNext = new Int32Array(data.count).fill(-1)
    for (let i = 0; i < data.count; i++) { const q = p.parent[i]; if (q >= 0) { childNext[i] = childHead[q]; childHead[q] = i } }
    const linksOf = (i: number) => {
      const out = new Set<string>()
      if (p.parent[i] >= 0) out.add(`e${i}`)
      for (let c = childHead[i]; c >= 0; c = childNext[c]) out.add(`e${c}`)
      return out
    }

    const rootKey = String(data.meta.rootIndex)
    const sigma = new Sigma(graph, container.current, {
      renderEdgeLabels: false,
      // Names stay hidden until a player is selected, searched, or part of a found path (those use forceLabel); hover still shows a tag.
      labelRenderedSizeThreshold: Number.POSITIVE_INFINITY,
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
        const detail = detailNow()
        const picked = st.pfNodes.size > 0 || st.selected !== null
        if (attrs.cluster) {
          if (attrs.cluster !== detail) return { ...attrs, hidden: true }
          return picked ? { ...attrs, color: DIM_NODE, zIndex: 0 } : attrs
        }
        if (detail !== 'full') {
          // Zoomed out: individual dots stay hidden except the center, the selection and its path, and a found path.
          if (st.pfNodes.has(node)) return { ...attrs, size: 6, color: '#ffd23f', forceLabel: true, zIndex: 3 }
          if (st.pfNodes.size === 0 && st.selected !== null && st.nodes.has(node)) {
            const isSel = node === String(st.selected)
            return { ...attrs, size: isSel ? 8 : Math.max(attrs.size * 1.6, 3), color: isSel ? '#ffffff' : attrs.color, forceLabel: isSel, zIndex: isSel ? 3 : 2, highlighted: isSel }
          }
          if (node === rootKey) return { ...attrs, zIndex: 3 }
          return { ...attrs, hidden: true }
        }
        if (st.pfNodes.size) {
          if (st.pfNodes.has(node)) return { ...attrs, size: 6, color: '#ffd23f', forceLabel: true, zIndex: 3 }
          return { ...attrs, color: DIM_NODE, label: null, zIndex: 0 }
        }
        if (st.selected === null) {
          if (st.focusDepth === null) return attrs
          if (attrs.depth === st.focusDepth) return { ...attrs, size: Math.max(attrs.size * 1.6, 2.5), zIndex: 2 }
          return { ...attrs, color: FOCUS_DIM_NODE, label: null, zIndex: 0 }
        }
        if (st.nodes.has(node)) {
          const isSel = node === String(st.selected)
          return { ...attrs, size: isSel ? 8 : Math.max(attrs.size * 1.6, 3), color: isSel ? '#ffffff' : attrs.color,
            forceLabel: isSel, zIndex: isSel ? 3 : 2, highlighted: isSel }
        }
        return { ...attrs, color: DIM_NODE, label: null, zIndex: 0 }
      },
      // Links are hidden unless they belong to the selection, a hovered player, a found path or an isolated layer (or classic view).
      edgeReducer: (edge, attrs) => {
        const st = state.current
        if (st.pfEdges.size) {
          if (st.pfEdges.has(edge)) return { ...attrs, color: '#ffd23f', size: 4, zIndex: 3, hidden: false }
          return st.classic ? { ...attrs, color: EDGE_DIM, hidden: st.ratio > ZOOM_REVEAL_RATIO && attrs.depth >= DEEP_EDGE_DEPTH } : { ...attrs, hidden: true }
        }
        if (st.edges.has(edge)) return { ...attrs, color: PATH_COLOR, size: 3, zIndex: 2 }
        if (st.hoverEdges.has(edge)) return { ...attrs, color: edgeColorFocused(attrs.depth), size: 1, zIndex: 1 }
        if (st.focusDepth !== null && attrs.depth === st.focusDepth) return { ...attrs, color: edgeColorFocused(attrs.depth), zIndex: 1 }
        if (!st.classic) return { ...attrs, hidden: true }
        const deepHidden = st.ratio > ZOOM_REVEAL_RATIO && attrs.depth >= DEEP_EDGE_DEPTH
        if (st.selected !== null || st.focusDepth !== null) return deepHidden ? { ...attrs, hidden: true } : { ...attrs, color: EDGE_DIM, zIndex: 0 }
        return deepHidden ? { ...attrs, hidden: true } : attrs
      },
    })
    sigmaRef.current = sigma

    sigma.on('clickNode', ({ node }) => {
      const a = graph.getNodeAttributes(node)
      if (a.cluster) { // a bubble: zoom in to reveal what it holds
        const d = sigma.getNodeDisplayData(node)
        if (d) sigma.getCamera().animate({ x: d.x, y: d.y, ratio: ZOOM_INTO[a.cluster as 'coarse' | 'fine'] }, { duration: dur(700), easing: 'cubicInOut' })
        return
      }
      onSelectRef.current(Number(node))
    })
    sigma.on('clickStage', () => onSelectRef.current(null))
    sigma.on('enterNode', ({ node }) => {
      if (container.current) container.current.style.cursor = 'pointer'
      if (graph.getNodeAttribute(node, 'cluster') || detailNow() !== 'full') return
      state.current.hover = node
      state.current.hoverEdges = linksOf(Number(node))
      sigma.refresh({ skipIndexation: true })
    })
    sigma.on('leaveNode', () => {
      if (container.current) container.current.style.cursor = ''
      if (state.current.hover === null) return
      state.current.hover = null
      state.current.hoverEdges = new Set()
      sigma.refresh({ skipIndexation: true })
    })
    // Intro: start slightly zoomed out and ease into the fitted view.
    const cam = sigma.getCamera()
    cam.on('updated', ({ ratio }) => {
      const st = state.current
      const before = `${detailNow()}${st.ratio > ZOOM_REVEAL_RATIO}`
      st.ratio = ratio
      if (`${detailNow()}${ratio > ZOOM_REVEAL_RATIO}` !== before) {
        st.hover = null; st.hoverEdges = new Set()
        sigma.refresh({ skipIndexation: true })
      }
    })
    cam.setState({ ...cam.getState(), ratio: 1.8 })
    cam.animate({ ratio: 1 }, { duration: dur(1400), easing: 'cubicOut' })

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
      if (d) cam.animate({ x: d.x, y: d.y, ratio: Math.min(cam.getState().ratio, 0.2) }, { duration: dur(800), easing: 'cubicInOut' })
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
          { duration: dur(900), easing: 'cubicInOut' },
        )
      }
    }
    sigma.refresh()
    return () => { added.forEach((k) => { if (graph.hasEdge(k)) graph.dropEdge(k) }) }
  }, [pathPlayers, data])

  useEffect(() => {
    state.current.classic = classic
    sigmaRef.current?.refresh()
  }, [classic])

  useEffect(() => {
    state.current.focusDepth = focusDepth
    sigmaRef.current?.refresh()
  }, [focusDepth])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onSelectRef.current(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return <main ref={container} className="graph-canvas" aria-label="Network graph of every major leaguer. Use the search and path finder for keyboard access." />
})

export default GraphCanvas
