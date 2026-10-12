import { DEPTH_COLORS } from '../lib/colors'

export default function GraphLegend({ maxDepth }: { maxDepth: number }) {
  return (
    <div className="legend" aria-label="Degrees of separation legend">
      <div className="legend-title">Degrees of separation</div>
      {DEPTH_COLORS.slice(0, Math.min(maxDepth, 10) + 1).map((c, d) => (
        <div className="legend-row" key={d}>
          <span className="swatch" style={{ background: c, boxShadow: d === 0 ? `0 0 8px ${c}` : undefined }} />
          {d === 0 ? 'Root' : d}
        </div>
      ))}
    </div>
  )
}
