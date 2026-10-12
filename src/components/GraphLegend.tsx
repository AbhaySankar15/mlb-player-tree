import { DEPTH_COLORS } from '../lib/colors'

interface Props {
  maxDepth: number
  focusDepth: number | null
  onFocus: (depth: number | null) => void
}

export default function GraphLegend({ maxDepth, focusDepth, onFocus }: Props) {
  return (
    <aside className="legend" aria-label="Degrees of separation legend">
      <div className="legend-title">Degrees of separation</div>
      {DEPTH_COLORS.slice(0, Math.min(maxDepth, 10) + 1).map((c, d) => (
        <div
          className={`legend-row${focusDepth === d ? ' active' : ''}`}
          key={d}
          tabIndex={0}
          onMouseEnter={() => onFocus(d)}
          onMouseLeave={() => onFocus(null)}
          onFocus={() => onFocus(d)}
          onBlur={() => onFocus(null)}
        >
          <span className="swatch" style={{ background: c, boxShadow: d === 0 ? `0 0 8px ${c}` : undefined }} />
          {d === 0 ? 'Root' : d}
        </div>
      ))}
      <div className="legend-hint">Hover a row to isolate a layer. Zoom in to reveal outer-layer links.</div>
    </aside>
  )
}
