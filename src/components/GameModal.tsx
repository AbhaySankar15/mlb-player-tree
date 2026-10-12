import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { GraphData } from '../types/graph'
import { formatTeamSeason } from '../lib/loadGraph'
import { MAX_POINTS, ROUNDS, evaluateGuess, feedbackText, generateRound, mulberry32, scoreRound, sharedTeamSeasons, type Difficulty, type Round } from '../lib/game'
import type { RostersState } from '../lib/useRosters'
import { PlayerAvatar } from './Badges'
import SearchBox from './SearchBox'
import Leaderboard from './Leaderboard'
import { loadNickname, saveNickname, submitScore } from '../lib/leaderboardApi'
import { NAME_MAX, validateName } from '../lib/leaderboardRules'
import {
  DAILY_DIFFICULTIES, challengeUrl, dailyFor, dateKey, dateSeed, emojiFor, loadGames, saveGame, shareText, summarize, type GameRecord,
} from '../lib/dailyStats'

export type GameStart = { mode: 'daily' } | { mode: 'practice'; seed: number; difficulty: Difficulty }

interface Props {
  data: GraphData
  rosters: RostersState
  /** Auto-start from a shared link (?daily=1 or ?seed=..&difficulty=..). */
  initial?: GameStart | null
  onClose: () => void
  onShowOnGraph: (a: number, c: number) => void
}

interface Done { solved: boolean; points: number; guess: number | null; wrong: number; hints: number }
interface Play { mode: 'daily' | 'practice'; difficulties: Difficulty[]; seed: number; date: string; nickname?: string }
type Stage = { kind: 'menu' } | ({ kind: 'play'; round: number; results: Done[] } & Play) | ({ kind: 'end'; results: Done[] } & Play)

const isDebug = () => import.meta.env.DEV || new URLSearchParams(location.search).has('debug')
/** Today's local date; `?date=YYYY-MM-DD` overrides it in debug mode (for testing the daily and streaks). */
function todayKey(): string {
  const o = new URLSearchParams(location.search).get('date')
  return isDebug() && o && /^\d{4}-\d{2}-\d{2}$/.test(o) ? o : dateKey()
}

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

export default function GameModal({ data, rosters, initial, onClose, onShowOnGraph }: Props) {
  const [stage, setStage] = useState<Stage>({ kind: 'menu' })
  const today = useMemo(todayKey, [])
  const [games, setGames] = useState<GameRecord[]>(() => loadGames())
  const started = useRef(false)

  const startDaily = useCallback((nickname?: string) => setStage({ kind: 'play', mode: 'daily', difficulties: DAILY_DIFFICULTIES, seed: dateSeed(today), date: today, nickname, round: 0, results: [] }), [today])
  const startPractice = useCallback((d: Difficulty, seed = seedFromUrl()) =>
    setStage({ kind: 'play', mode: 'practice', difficulties: Array(ROUNDS).fill(d), seed, date: today, round: 0, results: [] }), [today])

  // Shared links start the game immediately (once rosters are ready).
  useEffect(() => {
    if (started.current || !initial || rosters.status !== 'ready') return
    started.current = true
    if (initial.mode === 'daily') { /* the menu asks for a nickname first */ }
    else startPractice(initial.difficulty, initial.seed)
  }, [initial, rosters.status, games, today, startDaily, startPractice])

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
          <Menu games={games} today={today} autoPrompt={initial?.mode === 'daily'} onDaily={startDaily} onPractice={(d) => startPractice(d)} />
        ) : stage.kind === 'play' ? (
          <RoundView
            key={`${stage.mode}-${stage.round}-${stage.seed}`}
            data={data} index={rosters.index} seed={stage.seed} stage={stage}
            onFinish={(d) => {
              const results = [...stage.results, d]
              setStage(stage.round + 1 >= ROUNDS ? { ...stage, kind: 'end', results } : { ...stage, round: stage.round + 1, results })
            }}
            onShowOnGraph={onShowOnGraph}
          />
        ) : (
          <End stage={stage} today={today} onSaved={setGames} onAgain={() => setStage({ kind: 'menu' })} />
        )}
      </div>
    </div>
  )
}

function Menu({ games, today, autoPrompt, onDaily, onPractice }: { games: GameRecord[]; today: string; autoPrompt: boolean; onDaily: (nickname: string) => void; onPractice: (d: Difficulty) => void }) {
  const done = dailyFor(games, today)
  const stats = summarize(games, today)
  const [asking, setAsking] = useState(autoPrompt && !done)
  const [nick, setNick] = useState(loadNickname)
  const [nickErr, setNickErr] = useState<string | null>(null)
  const begin = () => {
    const err = validateName(nick)
    if (err) { setNickErr(err); return }
    const clean = nick.trim().replace(/\s+/g, ' ')
    saveNickname(clean)
    onDaily(clean)
  }
  return (
    <div className="modal-body">
      <p>You get two players who never shared a team-season, but <b>someone</b> played with both. Name any player who was a teammate of both.</p>
      <p className="muted">{ROUNDS} rounds · up to {MAX_POINTS} points each · wrong guesses and hints cost a point.</p>

      <div className="daily-card">
        <div>
          <b>Daily challenge · {today}</b>
          <div className="muted">{done ? `Played: ${done.score}/${done.max}  ${done.rounds.map(emojiFor).join('')}` : 'Same five rounds for everyone today, ramping easy → hard.'}</div>
        </div>
        <button className="btn play" onClick={() => setAsking(true)} disabled={!!done || asking}>{done ? 'Done · back tomorrow' : 'Play daily'}</button>
      </div>
      {asking && !done && (
        <form className="nick-form" onSubmit={(e) => { e.preventDefault(); begin() }}>
          <label htmlFor="nick">Pick a nickname for the leaderboard (shown publicly)</label>
          <div className="nick-row">
            <input id="nick" className="search-input" value={nick} maxLength={NAME_MAX} autoFocus autoComplete="nickname" placeholder="e.g. Sandlot Sam"
              aria-invalid={!!nickErr} aria-describedby="nick-err" onChange={(e) => { setNick(e.target.value); setNickErr(null) }} />
            <button className="btn play" type="submit">Start</button>
          </div>
          <p id="nick-err" className="game-msg" role="alert">{nickErr}</p>
          <p className="note">Your score is posted when you finish. Don&rsquo;t use your real name or personal information.</p>
        </form>
      )}
      <Leaderboard date={today} me={loadNickname()} />

      <h3 className="mini-h">Practice</h3>
      <div className="diff-btns">
        {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
          <button key={d} className="btn diff" onClick={() => onPractice(d)}><b>{DIFF[d]}</b><span>{DIFF_HELP[d]}</span></button>
        ))}
      </div>

      <h3 className="mini-h">Your stats <span className="muted">(saved on this device only)</span></h3>
      <div className="statgrid stats4">
        <div><span>DAILY STREAK</span><b>{stats.current}</b></div>
        <div><span>BEST STREAK</span><b>{stats.best}</b></div>
        <div><span>DAILIES</span><b>{stats.dailyPlayed}</b></div>
        <div><span>GAMES</span><b>{stats.played}</b></div>
      </div>
      {stats.top.length > 0 && (
        <ol className="guesses">
          {stats.top.map((g, i) => (
            <li key={i}>{g.score}/{g.max} · {g.mode === 'daily' ? `Daily ${g.date}` : `${g.difficulty} practice`} · {g.date}</li>
          ))}
        </ol>
      )}
      <p className="note">Streaks and personal stats stay in this browser. Only your nickname and daily score are sent to the leaderboard.</p>
    </div>
  )
}

function RoundView({ data, index, seed, stage, onFinish, onShowOnGraph }: {
  data: GraphData; index: Parameters<typeof generateRound>[0]; seed: number
  stage: Extract<Stage, { kind: 'play' }>; onFinish: (d: Done) => void; onShowOnGraph: (a: number, c: number) => void
}) {
  const round: Round = useMemo(
    () => generateRound(index, data.players.degree, mulberry32(seed + stage.round * 7919), stage.difficulties[stage.round]),
    [index, data, seed, stage.round, stage.difficulties],
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
      <div className="round-head">Round {stage.round + 1} of {ROUNDS} · {stage.mode === 'daily' ? `Daily ${stage.date}` : DIFF[stage.difficulties[0]]} · {DIFF[stage.difficulties[stage.round]]} · Score {stage.results.reduce((s, r) => s + r.points, 0)}</div>
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

type Post = { kind: 'idle' } | { kind: 'sending' } | { kind: 'posted'; rank: number } | { kind: 'failed'; status: number; message: string }

function End({ stage, today, onSaved, onAgain }: { stage: Extract<Stage, { kind: 'end' }>; today: string; onSaved: (g: GameRecord[]) => void; onAgain: () => void }) {
  const total = stage.results.reduce((s, r) => s + r.points, 0)
  const rec: GameRecord = useMemo(() => ({
    date: stage.date, mode: stage.mode, difficulty: stage.mode === 'daily' ? 'daily' : stage.difficulties[0], score: total, max: ROUNDS * MAX_POINTS,
    rounds: stage.results.map((r) => ({ solved: r.solved, points: r.points, wrong: r.wrong, hints: r.hints })), playedAt: Date.now(),
  }), [stage, total])
  const saved = useRef(false)
  const [copied, setCopied] = useState<string | null>(null)
  const link = challengeUrl(location.href, { mode: stage.mode, difficulty: stage.difficulties[0], seed: stage.seed })
  const text = shareText(rec, link)
  const stats = summarize(loadGames(), today)
  const [post, setPost] = useState<Post>({ kind: 'idle' })
  const [nick, setNick] = useState(stage.nickname ?? loadNickname())
  const [board, setBoard] = useState(0)

  const post_ = useCallback(async (name: string) => {
    setPost({ kind: 'sending' })
    const r = await submitScore(stage.date, name, rec.rounds)
    if (r.ok) { saveNickname(name); setNick(name); setPost({ kind: 'posted', rank: r.data.rank }); setBoard((n) => n + 1) }
    else setPost({ kind: 'failed', status: r.status, message: r.message })
  }, [stage.date, rec.rounds])

  useEffect(() => {
    if (saved.current) return
    saved.current = true
    if (stage.mode === 'daily' && dailyFor(loadGames(), stage.date)) return // never record the daily twice
    saveGame(rec)
    onSaved(loadGames())
    if (stage.mode === 'daily' && stage.nickname) void post_(stage.nickname)
  }, [rec, stage, onSaved, post_])

  const copy = async (what: string, value: string) => {
    try { await navigator.clipboard.writeText(value); setCopied(what) } catch { setCopied('manual') }
  }
  const nativeShare = typeof navigator !== 'undefined' && 'share' in navigator

  return (
    <div className="modal-body" role="status">
      <p className="reveal-title">{stage.mode === 'daily' ? `Daily ${stage.date}` : `${DIFF[stage.difficulties[0]]} practice`}: {total} / {ROUNDS * MAX_POINTS}</p>
      <p className="emoji-row" aria-label="Round results">{rec.rounds.map(emojiFor).join('')}</p>
      <ol className="guesses">
        {stage.results.map((r, i) => (
          <li key={i} className={r.solved ? 'ok' : 'bad'}>Round {i + 1}: {r.solved ? `solved, ${r.points} pt` : 'missed, 0 pt'} · {r.wrong} wrong · {r.hints} hint{r.hints === 1 ? '' : 's'}</li>
        ))}
      </ol>
      <p className="muted">Daily streak: {stats.current} (best {stats.best})</p>
      {stage.mode === 'daily' && (
        <>
          {post.kind === 'sending' && <p className="hint" role="status">Posting your score…</p>}
          {post.kind === 'posted' && <p className="hint" role="status">Posted as <b>{nick}</b>: rank #{post.rank} today.</p>}
          {post.kind === 'failed' && (
            <form className="nick-form" onSubmit={(e) => { e.preventDefault(); const err = validateName(nick); if (err) setPost({ kind: 'failed', status: 400, message: err }); else void post_(nick.trim().replace(/\s+/g, ' ')) }}>
              <p className="game-msg" role="alert">{post.message}</p>
              <div className="nick-row">
                <input className="search-input" value={nick} maxLength={NAME_MAX} aria-label="Nickname" onChange={(e) => setNick(e.target.value)} />
                <button className="btn" type="submit">{post.status === 0 || post.status >= 500 ? 'Retry' : 'Submit'}</button>
              </div>
            </form>
          )}
          <Leaderboard date={stage.date} me={nick} refreshKey={board} />
        </>
      )}
      <div className="hint-row">
        <button className="btn" onClick={() => copy('result', text)}>Copy result</button>
        <button className="btn" onClick={() => copy('link', link)}>{stage.mode === 'daily' ? 'Copy daily link' : 'Copy challenge link'}</button>
        {nativeShare && <button className="btn" onClick={() => navigator.share({ text }).catch(() => undefined)}>Share…</button>}
        <button className="btn small" onClick={onAgain}>Menu</button>
      </div>
      {copied && copied !== 'manual' && <p className="hint">Copied {copied === 'result' ? 'your result' : 'the link'} to the clipboard.</p>}
      {copied === 'manual' && <textarea className="share-box" readOnly value={text} onFocus={(e) => e.currentTarget.select()} aria-label="Copy this text" />}
    </div>
  )
}
