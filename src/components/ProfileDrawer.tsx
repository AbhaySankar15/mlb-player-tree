import { useCallback, useEffect, useMemo, useState } from 'react'
import type { GraphData } from '../types/graph'
import type { Profile, StatRow, TeamsData } from '../types/profile'
import { loadProfile } from '../lib/profiles'
import {
  battingRates, compressYears, fmtDec2, fmtHeight, fmtInt, fmtIP, fmtRate, pitchingRates, statObject, totals,
} from '../lib/stats'

interface Props {
  data: GraphData
  selected: number
  onClose: () => void
}

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; profile: Profile; teams: TeamsData }

const parseTs = (ts: string) => {
  const [year, lg, team] = ts.split('-')
  return { year: Number(year), lg, team }
}

export default function ProfileDrawer({ data, selected, onClose }: Props) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const id = data.players.id[selected]

  const load = useCallback(() => {
    setState({ status: 'loading' })
    let cancelled = false
    loadProfile(selected, id)
      .then((r) => { if (!cancelled) setState({ status: 'ready', ...r }) })
      .catch((e) => { if (!cancelled) setState({ status: 'error', message: e instanceof Error ? e.message : String(e) }) })
    return () => { cancelled = true }
  }, [selected, id])
  useEffect(load, [load])

  // Esc closes the drawer first (capture phase, before the canvas deselect handler).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopImmediatePropagation(); onClose() }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  const name = data.players.name[selected]
  return (
    <aside className="drawer" aria-label={`Profile of ${name}`}>
      <div className="drawer-head">
        <div>
          <h2>{name}</h2>
          <div className="drawer-sub">{data.players.debut[selected]}–{data.players.final[selected]} · {id}</div>
        </div>
        <button className="btn small" onClick={onClose} aria-label="Close profile">Close</button>
      </div>
      {state.status === 'loading' && <div className="drawer-status" role="status"><div className="spinner small" />Loading profile…</div>}
      {state.status === 'error' && (
        <div className="drawer-status" role="alert">
          <p>Could not load profile.</p><p className="muted">{state.message}</p>
          <button className="btn" onClick={load}>Retry</button>
        </div>
      )}
      {state.status === 'ready' && <ProfileBody data={data} selected={selected} profile={state.profile} teams={state.teams} />}
    </aside>
  )
}

function ProfileBody({ data, selected, profile, teams }: { data: GraphData; selected: number; profile: Profile; teams: TeamsData }) {
  const { bio } = profile
  const byTs = useMemo(() => {
    const bat = new Map<number, StatRow>(); (profile.bat ?? []).forEach((r) => bat.set(r[0] as number, r))
    const pit = new Map<number, StatRow>(); (profile.pit ?? []).forEach((r) => pit.set(r[0] as number, r))
    return { bat, pit }
  }, [profile])

  // One row per team-season (apps), ordered by year then team.
  const seasons = useMemo(() => {
    const rows = profile.apps.map(([tsi, g]) => ({ tsi, g, statsOnly: false, ts: parseTs(data.teamSeasons[tsi]) }))
    // Stat lines for a team-season with no Appearances row (a source gap): shown, but flagged as not used for teammate links.
    const have = new Set(rows.map((r) => r.tsi))
    for (const r of [...(profile.bat ?? []), ...(profile.pit ?? [])]) {
      const tsi = r[0] as number
      if (have.has(tsi)) continue
      have.add(tsi)
      const g = (profile.bat ?? []).find((x) => x[0] === tsi)?.[1] ?? (profile.pit ?? []).find((x) => x[0] === tsi)?.[teams.pit.indexOf('G') + 1] ?? null
      rows.push({ tsi, g, statsOnly: true, ts: parseTs(data.teamSeasons[tsi]) })
    }
    return rows.sort((a, b) => a.ts.year - b.ts.year || a.ts.team.localeCompare(b.ts.team))
  }, [profile, data.teamSeasons, teams])

  const teamGroups = useMemo(() => {
    const m = new Map<string, { name: string; lg: Set<string>; years: number[]; g: number; latest: number }>()
    for (const s of seasons) {
      const key = s.ts.team + '|' + s.ts.lg
      const nm = teams.name[s.tsi] || s.ts.team
      const e = m.get(key) ?? { name: nm, lg: new Set<string>(), years: [], g: 0, latest: 0 }
      e.years.push(s.ts.year); e.lg.add(s.ts.lg); e.g += s.g ?? 0
      if (s.ts.year >= e.latest) { e.latest = s.ts.year; e.name = nm }
      m.set(key, e)
    }
    return [...m.values()].sort((a, b) => Math.min(...a.years) - Math.min(...b.years))
  }, [seasons, teams])

  const batT = useMemo(() => totals(profile.bat, teams.bat), [profile, teams])
  const pitT = useMemo(() => totals(profile.pit, teams.pit), [profile, teams])
  const hasBat = (batT.AB ?? 0) > 0
  const hasPit = (pitT.IPouts ?? 0) > 0
  const totalG = seasons.reduce((a, s) => a + (s.g ?? 0), 0)

  const born = [bio.birthYear, [bio.birthCity, bio.birthState, bio.birthCountry].filter(Boolean).join(', ')].filter(Boolean).join(' · ')
  const hw = [fmtHeight(bio.height), bio.weight ? `${bio.weight} lb` : null].filter(Boolean).join(' · ')
  const bbref = bio.bbrefID ? `https://www.baseball-reference.com/players/${bio.bbrefID[0]}/${bio.bbrefID}.shtml` : null

  return (
    <div className="drawer-body">
      <dl className="bio">
        {bio.nameGiven && <><dt>Full name</dt><dd>{bio.nameGiven}</dd></>}
        {profile.pos && <><dt>Primary position</dt><dd>{profile.pos}</dd></>}
        {born && <><dt>Born</dt><dd>{born}</dd></>}
        {bio.deathYear && <><dt>Died</dt><dd>{bio.deathYear}</dd></>}
        {hw && <><dt>Height / weight</dt><dd>{hw}</dd></>}
        {(bio.bats || bio.throws) && <><dt>Bats / throws</dt><dd>{bio.bats ?? '—'} / {bio.throws ?? '—'}</dd></>}
        {bio.debut && <><dt>Debut</dt><dd>{bio.debut}</dd></>}
        {bio.finalGame && <><dt>Final game</dt><dd>{bio.finalGame}</dd></>}
        <dt>Seasons / team-seasons</dt><dd>{new Set(seasons.map((s) => s.ts.year)).size} / {seasons.length}</dd>
        <dt>Games (all)</dt><dd>{fmtInt(totalG)}</dd>
        <dt>Unique career teammates</dt><dd>{fmtInt(data.players.degree[selected])}</dd>
      </dl>
      {bbref && <a className="ext" href={bbref} target="_blank" rel="noreferrer noopener">Baseball-Reference page ↗</a>}

      <h3>Teams</h3>
      <table className="tbl">
        <thead><tr><th>Team</th><th>Years</th><th className="n">G</th></tr></thead>
        <tbody>
          {teamGroups.map((t, i) => (
            <tr key={i}><td>{t.name} <span className="lg">{[...t.lg].join('/')}</span></td><td>{compressYears(t.years)}</td><td className="n">{fmtInt(t.g)}</td></tr>
          ))}
        </tbody>
      </table>

      {hasBat && (() => {
        const r = battingRates(batT)
        return (<>
          <h3>Career batting</h3>
          <div className="statgrid">
            {([['G', fmtInt(batT.G)], ['AB', fmtInt(batT.AB)], ['R', fmtInt(batT.R)], ['H', fmtInt(batT.H)], ['2B', fmtInt(batT['2B'])],
              ['3B', fmtInt(batT['3B'])], ['HR', fmtInt(batT.HR)], ['RBI', fmtInt(batT.RBI)], ['SB', fmtInt(batT.SB)], ['BB', fmtInt(batT.BB)],
              ['SO', fmtInt(batT.SO)], ['AVG', fmtRate(r.AVG)], ['OBP', fmtRate(r.OBP)], ['SLG', fmtRate(r.SLG)], ['OPS', fmtRate(r.OPS)]] as const)
              .map(([k, v]) => <div key={k}><span>{k}</span><b>{v}</b></div>)}
          </div>
        </>)
      })()}

      {hasPit && (() => {
        const r = pitchingRates(pitT)
        return (<>
          <h3>Career pitching</h3>
          <div className="statgrid">
            {([['W', fmtInt(pitT.W)], ['L', fmtInt(pitT.L)], ['ERA', fmtDec2(r.ERA)], ['G', fmtInt(pitT.G)], ['GS', fmtInt(pitT.GS)],
              ['SV', fmtInt(pitT.SV)], ['IP', fmtIP(pitT.IPouts)], ['H', fmtInt(pitT.H)], ['ER', fmtInt(pitT.ER)], ['HR', fmtInt(pitT.HR)],
              ['BB', fmtInt(pitT.BB)], ['SO', fmtInt(pitT.SO)], ['WHIP', fmtDec2(r.WHIP)]] as const)
              .map(([k, v]) => <div key={k}><span>{k}</span><b>{v}</b></div>)}
          </div>
        </>)
      })()}
      {!hasBat && !hasPit && <p className="muted">No batting or pitching lines are recorded for this player in the source data.</p>}

      <h3>Season by season</h3>
      <div className="tbl-wrap">
        <table className="tbl seasons">
          <thead><tr><th>Year</th><th>Team</th><th className="n">G</th>{hasBat && <th>Batting</th>}{hasPit && <th>Pitching</th>}<th>Team W–L</th></tr></thead>
          <tbody>
            {seasons.map((s) => {
              const b = byTs.bat.get(s.tsi), p = byTs.pit.get(s.tsi)
              const bs = b && statObject(b, teams.bat), ps = p && statObject(p, teams.pit)
              const br = bs && battingRates(bs), pr = ps && pitchingRates(ps)
              const w = teams.w[s.tsi], l = teams.l[s.tsi]
              return (
                <tr key={s.tsi}>
                  <td>{s.ts.year}{s.statsOnly && <sup title="Stats recorded, but no Appearances row in the source, so this team-season is not used for teammate links"> *</sup>}</td>
                  <td>{teams.name[s.tsi] || s.ts.team} <span className="lg">{s.ts.lg}</span></td>
                  <td className="n">{fmtInt(s.g)}</td>
                  {hasBat && <td>{!bs ? '—' : (bs.AB ?? 0) > 0 ? `${fmtRate(br!.AVG)} · ${fmtInt(bs.HR)} HR · ${fmtInt(bs.RBI)} RBI` : `${fmtInt(bs.AB ?? 0)} AB`}</td>}
                  {hasPit && <td>{!ps ? '—' : `${fmtInt(ps.W)}–${fmtInt(ps.L)} · ${fmtDec2(pr!.ERA)} ERA · ${fmtIP(ps.IPouts)} IP · ${fmtInt(ps.SO)} SO`}</td>}
                  <td>{w != null && l != null ? `${w}–${l}` : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {seasons.some((s) => s.statsOnly) && <p className="note">* Stats are recorded for this team-season, but the source has no Appearances row for it, so it is not used to link teammates in the graph.</p>}
      <p className="note">Statistics: SABR Lahman Baseball Database 2025 (CC BY-SA 3.0); Negro Leagues data licensed from Seamheads.com. Blank source values are shown as “—”, and some historical lines (especially Negro Leagues) are incomplete.</p>
    </div>
  )
}
