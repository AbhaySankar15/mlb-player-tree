import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { GraphData } from '../types/graph'
import { PlayerAvatar } from './Badges'
import { buildSearchIndex, search } from '../lib/search'

interface Props {
  data: GraphData
  onSelect: (index: number) => void
}

export default function SearchBox({ data, onSelect }: Props) {
  const index = useMemo(() => buildSearchIndex(data), [data])
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const listId = useId()
  const results = useMemo(() => search(index, query), [index, query])

  // "/" focuses search from anywhere (unless typing in a field already).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (e.key === '/' && !(el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA'))) {
        e.preventDefault()
        input.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const choose = (i: number) => {
    const r = results[i]
    if (!r) return
    onSelect(r.index)
    setQuery(r.name)
    setOpen(false)
    input.current?.blur()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); choose(active) }
    else if (e.key === 'Escape') {
      e.stopPropagation()
      if (open && results.length) setOpen(false)
      else { setQuery(''); input.current?.blur() }
    }
  }

  const showList = open && query.trim().length >= 2
  return (
    <div className="search">
      <input
        ref={input}
        className="search-input"
        type="search"
        placeholder="Search any player…  ( / )"
        aria-label="Search players"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && results.length ? `${listId}-${active}` : undefined}
        autoComplete="off"
        spellCheck={false}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0) }}
        onFocus={(e) => { setOpen(true); e.currentTarget.select() }}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      {showList && (
        <ul className="search-results" id={listId} role="listbox">
          {results.length === 0 && <li className="search-empty">No players match “{query.trim()}”</li>}
          {results.map((r, i) => (
            <li
              key={r.index}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'active' : ''}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => { e.preventDefault(); choose(i) }}
            >
              <PlayerAvatar id={r.id} name={r.name} size={30} />
              <span className="sr-text">
                <span className="sr-name">{r.name}</span>
                <span className="sr-meta">{r.years} · {r.degree.toLocaleString('en-US')} teammates · {r.id}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
