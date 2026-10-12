import { colorFor, initials, leagueChips, playerImageUrl, teamAbbr } from '../lib/avatar'

export function PlayerAvatar({ id, name, size = 40, ringColor }: { id: string; name: string; size?: number; ringColor?: string }) {
  const url = playerImageUrl(id)
  const { bg, fg } = colorFor(id)
  const style = { width: size, height: size, fontSize: size * 0.38, background: bg, color: fg, boxShadow: ringColor ? `0 0 0 2px ${ringColor}` : undefined }
  return url
    ? <img className="avatar" src={url} alt="" width={size} height={size} style={{ ...style, objectFit: 'cover' }} />
    : <span className="avatar" style={style} aria-hidden="true">{initials(name)}</span>
}

export function TeamBadge({ teamId }: { teamId: string }) {
  const { bg, fg } = colorFor(teamId)
  return <span className="team-badge" style={{ background: bg, color: fg }} aria-hidden="true">{teamAbbr(teamId)}</span>
}

export function LeagueChips({ leagues }: { leagues: string }) {
  return (
    <span className="chips">
      {leagueChips(leagues).map((c) => <span key={c} className={`chip${c === 'Negro Leagues' ? ' chip-negro' : ''}`}>{c}</span>)}
    </span>
  )
}
