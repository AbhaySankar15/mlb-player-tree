import { useCallback, useEffect, useMemo, useState } from 'react'
import type { GraphData } from '../types/graph'
import { formatTeamSeason } from '../lib/loadGraph'
import { MAX_POINTS, ROUNDS, evaluateGuess, feedbackText, generateRound, mulberry32, scoreRound, sharedTeamSeasons, type Difficulty, type Round } from '../lib/game'
import type { RostersState } from '../lib/useRosters'
import { PlayerAvatar } from './Badges'
import SearchBox from './SearchBox'

interface Props {
  data: GraphData
  rosters: RostersState
  onClose: () => void
  onShowOnGraph: (a: number, c: number) => void
}

interface Done { solved: boolean; points: number; guess: number | null; wrong: number; hints: number }
type Stage = { kind: 'menu' } | { kind: 'play'; difficulty: Difficulty; round: number; results: Done[] } | { kind: 'end'; difficulty: Difficulty; results: Done[] }

const DIFF: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }
const DIFF_HELP: Record<Difficulty, string> = {
  easy: 'Well-connected players, many valid answers.',
  medium: 'A few valid answers.',
  hard: 'Only one or two players fit.',
}

function seedFromUrl(): number {
  const s = new URLSearchParams(location.search).get('seed')
  const n = s ? Number(s) : NaN
  return Number.isFinite(n) ? n : (Date.now() & 0x7fffffff)
}

export default function GameModal({ data, rosters, onClose, onShowOnGraph }: Props) {
  const [stage, setStage] = useState<Stage>({ kind: 'menu' })
  const [seed, setSeed] = useState(seedFromUrl)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopImmediatePropagation(); onClose() } }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Name the link game">
        <div className="modal-head">
          <h2>Name the link</h2>
          <button className="btn small" onClick={onClose} aria-label="Close game">Close</button>
        </div>
        {rosters.status === 'error' ? (
          <div className="drawer-status" role="alert"><p>Could not load rosters.</p><p className="muted">{rosters.message}</p></div>
        ) : rosters.status !== 'ready' ? (
          <div className="drawer-status" role="status"><div className="spinner small" />Loading rosters…</div>
        ) : stage.kind === 'menu' ? (
          <Menu onStart={(d) => { setSeed(seedFromUrl()); setStage({ kind: 'play', difficulty: d, round: 0, results: [] }) }} />
        ) : stage.kind === 'play' ? (
          <RoundView
            key={`${stage.difficulty}-${stage.round}-${seed}`}
            data={data} index={rosters.index} seed={seed} stage={stage}
            onFinish={(d) => {
              const results = [...stage.results, d]
              setStage(stage.round + 1 >= ROUNDS ? { kind: 'end', difficulty: stage.difficulty, results } : { ...stage, round: stage.round + 1, results })
            }}
            onShowOnGraph={onShowOnGraph}
          />
        ) : (
          <End stage={stage} onAgain={() => setStage({ kind: 'menu' })} />
        )}
      </div>
    </div>
  )
}

function Menu({ onStart }: { onStart: (d: Difficulty) => void }) {
  return (
    <div className="modal-body">
      <p>You get two players who never shared a team-season, but <b>someone</b> played with both. Name any player who was a teammate of both.</p>
      <p className="muted">{ROUNDS} rounds · up to {MAX_POINTS} points each · wrong guesses and hints cost a point.</p>
      <div className="diff-btns">
        {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
          <button key={d} className="btn diff" onClick={() => onStart(d)}><b>{DIFF[d]}</b><span>{DIFF_HELP[d]}</span></button>
        ))}
      </div>
    </div>
  )
}

function RoundView({ data, index, seed, stage, onFinish, onShowOnGraph }: {
  data: GraphData; index: Parameters<typeof generateRound>[0]; seed: number
  stage: Extract<Stage, { kind: 'play' }>; onFinish: (d: Done) => void; onShowOnGraph: (a: number, c: number) => void
}) {
  const round: Round = useMemo(
    () => generateRound(index, data.players.degree, mulberry32(seed + stage.round * 7919), stage.difficulty),
    [index, data, seed, stage.round, stage.difficulty],
  )
  const [guesses, setGuesses] = useState<{ p: number; text: string; ok: boolean }[]>([])
  const [hints, setHints] = useState(0)
  const [outcome, setOutcome] = useState<{ solved: boolean; guess: number | null } | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const name = (i: number) => data.players.name[i]
  const wrong = guesses.filter((g) => !g.ok).length

  useEffect(() => {
    if (import.meta.env.DEV || new URLSearchParams(location.search).has('debug')) {
      ;(window as unknown as Record<string, unknown>).__mlbGame = { round, answers: round.connectors.map(name), ids: round.connectors.map((i) => data.players.id[i]), pair: [name(round.a), name(round.c)] }
    }
  })

  const submit = useCallback((p: number) => {
    if (outcome) return
    const r = evaluateGuess(index, round, p)
    if (r.kind === 'invalid') { setMsg(r.reason); return }
    if (guesses.some((g) => g.p === p)) { setMsg('You already tried that player.'); return }
    setMsg(null)
    if (r.kind === 'correct') { setGuesses((g) => [...g, { p, text: 'Correct!', ok: true }]); setOutcome({ solved: true, guess: p }) }
    else setGuesses((g) => [...g, { p, text: feedbackText(r, name(round.a), name(round.c)), ok: false }])
  }, [index, round, guesses, outcome]) // eslint-disable-line react-hooks/exhaustive-deps

  const hintConnector = round.connectors[0]
  const hintTs = sharedTeamSeasons(index, round.a, hintConnector)[0]
  const points = outcome ? scoreRound(outcome.solved, wrong, hints) : 0
  const example = outcome?.guess ?? hintConnector
  const ex1 = sharedTeamSeasons(index, round.a, example)[0], ex2 = sharedTeamSeasons(index, example, round.c)[0]

  return (
    <div className="modal-body">
      <div className="round-head">Round {stage.round + 1} of {ROUNDS} · {DIFF[stage.difficulty]} · Score {stage.results.reduce((s, r) => s + r.points, 0)}</div>
      <div className="duel">
        {[round.a, round.c].map((p) => (
          <div className="duel-card" key={p}>
            <PlayerAvatar id={data.players.id[p]} name={name(p)} size={52} />
            <div className="duel-name">{name(p)}</div>
            <div className="muted">{data.players.debut[p]}–{data.players.final[p]}</div>
          </div>
        ))}
      </div>
      <p className="duel-q">Who was a teammate of <b>both</b>?</p>

      {!outcome && (
        <>
          <SearchBox data={data} onSelect={submit} placeholder="Guess a player…" valueName="" />
          {msg && <p className="game-msg" role="alert">{msg}</p>}
          <div className="hint-row">
            <button className="btn small" disabled={hints >= 1} onClick={() => setHints(1)}>Hint: a team-season (−1)</button>
            <button className="btn small" disabled={hints < 1 || hints >= 2} onClick={() => setHints(2)}>Hint: initials (−1)</button>
            <button className="btn small" onClick={() => setOutcome({ solved: false, guess: null })}>Give up</button>
          </div>
          {hints >= 1 && <p className="hint">Someone who played with {name(round.a)} in {formatTeamSeason(data.teamSeasons[hintTs])} is a valid answer.</p>}
          {hints >= 2 && <p className="hint">One valid answer has the initials {name(hintConnector).split(/\s+/).map((w) => w[0]).join('.')}.</p>}
        </>
      )}

      {guesses.length > 0 && (
        <ul className="guesses">
          {guesses.map((g) => <li key={g.p} className={g.ok ? 'ok' : 'bad'}><b>{name(g.p)}</b> — {g.text}</li>)}
        </ul>
      )}

      {outcome && (
        <div className="reveal" role="status">
          <p className="reveal-title">{outcome.solved ? `Solved! +${points} point${points === 1 ? '' : 's'}` : 'The link was:'}</p>
          <p className="chain">
            {name(round.a)} <span className="trail-via">({formatTeamSeason(data.teamSeasons[ex1])})</span> → <b>{name(example)}</b>{' '}
            <span className="trail-via">({formatTeamSeason(data.teamSeasons[ex2])})</span> → {name(round.c)}
          </p>
          <p className="muted">
            {round.connectors.length} valid answer{round.connectors.length === 1 ? '' : 's'}:{' '}
            {round.connectors.slice(0, 8).map(name).join(', ')}{round.connectors.length > 8 ? ', …' : ''}
          </p>
          <div className="hint-row">
            <button className="btn" onClick={() => onFinish({ solved: outcome.solved, points, guess: outcome.guess, wrong, hints })}>
              {stage.round + 1 >= ROUNDS ? 'See results' : 'Next round'}
            </button>
            <button className="btn small" onClick={() => onShowOnGraph(round.a, round.c)}>Show on graph</button>
          </div>
        </div>
      )}
    </div>
  )
}

function End({ stage, onAgain }: { stage: Extract<Stage, { kind: 'end' }>; onAgain: () => void }) {
  const total = stage.results.reduce((s, r) => s + r.points, 0)
  return (
    <div className="modal-body" role="status">
      <p className="reveal-title">Final score: {total} / {ROUNDS * MAX_POINTS} ({DIFF[stage.difficulty]})</p>
      <ol className="guesses">
        {stage.results.map((r, i) => (
          <li key={i} className={r.solved ? 'ok' : 'bad'}>Round {i + 1}: {r.solved ? `solved, ${r.points} pt` : 'missed, 0 pt'} · {r.wrong} wrong · {r.hints} hint{r.hints === 1 ? '' : 's'}</li>
        ))}
      </ol>
      <button className="btn" onClick={onAgain}>Play again</button>
    </div>
  )
}
