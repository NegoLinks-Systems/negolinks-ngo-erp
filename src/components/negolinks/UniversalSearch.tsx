import { useEffect, useMemo, useRef, useState, type FC } from 'react'
import { useNavigate } from 'react-router-dom'
import { CornerDownLeft, Search, Sparkles, X } from 'lucide-react'
import { SEARCH_MODULES } from '@/lib/tables'
import { repository } from '@/lib/repository'
import { aiClient } from '@/lib/ai/client'
import { cn, debounce, titleCase } from '@/lib/utils'
import { AI_BRAND } from '@/constants'
import type { SearchHit } from '@/types'

interface UniversalSearchProps {
  isOpen: boolean
  onClose: () => void
}

const RECENT_KEY = 'negolinks-ngo-recent-searches'

const readRecent = (): string[] => {
  try {
    return JSON.parse(window.sessionStorage.getItem(RECENT_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}

export const UniversalSearch: FC<UniversalSearchProps> = ({ isOpen, onClose }) => {
  const [term, setTerm] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [aiAnswer, setAiAnswer] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [recent, setRecent] = useState<string[]>(readRecent)
  const [moduleFilter, setModuleFilter] = useState<string>('')
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const runSearch = useMemo(
    () =>
      debounce(async (value: string, filter: string) => {
        if (value.trim().length < 2) {
          setHits([])
          setLoading(false)
          return
        }
        setLoading(true)
        try {
          const targets = filter ? SEARCH_MODULES.filter((m) => m.module === filter) : SEARCH_MODULES
          const results = await Promise.all(
            targets.map(async (definition) => {
              const rows = await repository.list<Record<string, unknown>>(definition.table, {
                search: { term: value.trim(), columns: definition.searchColumns },
                limit: 6,
              })
              return rows.map<SearchHit>((row) => ({
                id: String(row.id),
                module: definition.label,
                label: String(row[definition.titleColumn] ?? 'Untitled'),
                sublabel: definition.subtitleColumns
                  .map((column) => titleCase(String(row[column] ?? '')))
                  .filter(Boolean)
                  .join(' • '),
                href: definition.route,
              }))
            }),
          )
          setHits(results.flat().slice(0, 40))
          setActiveIndex(0)
        } finally {
          setLoading(false)
        }
      }, 300),
    [],
  )

  useEffect(() => {
    if (isOpen) {
      window.setTimeout(() => inputRef.current?.focus(), 40)
    } else {
      setTerm('')
      setHits([])
      setAiAnswer(null)
      setModuleFilter('')
    }
  }, [isOpen])

  useEffect(() => {
    setAiAnswer(null)
    void runSearch(term, moduleFilter)
  }, [term, moduleFilter, runSearch])

  const remember = (value: string): void => {
    const next = [value, ...recent.filter((item) => item !== value)].slice(0, 10)
    setRecent(next)
    window.sessionStorage.setItem(RECENT_KEY, JSON.stringify(next))
  }

  const open = (hit: SearchHit): void => {
    remember(term)
    onClose()
    navigate(hit.href)
  }

  const askAi = async (): Promise<void> => {
    if (!term.trim()) return
    setAiLoading(true)
    remember(term)
    try {
      // Grounded strictly on RLS-filtered results the user can already see.
      const context = hits
        .slice(0, 25)
        .map((hit) => `${hit.module}: ${hit.label}${hit.sublabel ? ` (${hit.sublabel})` : ''}`)
        .join('\n')
      const result = await aiClient.chat({
        module: 'search',
        task: 'analysis',
        context,
        messages: [
          {
            role: 'system',
            content:
              'Answer using only the search results supplied. If they do not contain the answer, say so plainly and suggest a better search term.',
          },
          { role: 'user', content: term },
        ],
      })
      setAiAnswer(result.text)
    } finally {
      setAiLoading(false)
    }
  }

  if (!isOpen) return null

  const grouped = hits.reduce<Record<string, SearchHit[]>>((acc, hit) => {
    ;(acc[hit.module] ??= []).push(hit)
    return acc
  }, {})

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[8vh]">
      <button
        type="button"
        aria-label="Close search"
        className="absolute inset-0"
        style={{ background: 'var(--overlay)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      <div className="nl-card relative flex max-h-[80vh] w-full max-w-2xl animate-fade-up flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <Search size={17} className="shrink-0 text-ink-3" />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-3"
            placeholder="Search projects, grants, donors, beneficiaries, documents…"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                setActiveIndex((index) => Math.min(index + 1, hits.length - 1))
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault()
                setActiveIndex((index) => Math.max(index - 1, 0))
              }
              if (event.key === 'Enter') {
                const hit = hits[activeIndex]
                if (hit) open(hit)
              }
            }}
          />
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-3 hover:bg-card-alt hover:text-ink"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="scrollbar-none flex gap-1 overflow-x-auto border-b border-line px-3 py-2">
          <button
            type="button"
            onClick={() => setModuleFilter('')}
            className={cn(
              'whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-semibold transition-colors',
              !moduleFilter ? 'text-white' : 'text-ink-3 hover:text-ink',
            )}
            style={!moduleFilter ? { background: 'var(--accent-primary)' } : undefined}
          >
            All
          </button>
          {SEARCH_MODULES.map((definition) => (
            <button
              key={definition.module}
              type="button"
              onClick={() => setModuleFilter(definition.module)}
              className={cn(
                'whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-semibold transition-colors',
                moduleFilter === definition.module ? 'text-white' : 'text-ink-3 hover:text-ink',
              )}
              style={moduleFilter === definition.module ? { background: 'var(--accent-primary)' } : undefined}
            >
              {definition.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {term.trim().length < 2 ? (
            <div className="p-4">
              {recent.length ? (
                <>
                  <p className="nl-section-title mb-2">Recent searches</p>
                  <div className="flex flex-wrap gap-2">
                    {recent.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setTerm(item)}
                        className="rounded-full border border-line px-3 py-1 text-xs text-ink-2 hover:border-accent hover:text-accent-light"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-xs text-ink-3">
                  Type at least two characters. Search covers every module you have permission to view.
                </p>
              )}
            </div>
          ) : loading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="nl-skeleton h-11" />
              ))}
            </div>
          ) : hits.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-ink-2">No records matched “{term}”.</p>
              <p className="mt-1 text-xs text-ink-3">Try a different term, or ask AI Assistance below.</p>
            </div>
          ) : (
            Object.entries(grouped).map(([module, moduleHits]) => (
              <div key={module} className="mb-2">
                <p className="nl-section-title px-3 py-1.5">{module}</p>
                {moduleHits.map((hit) => {
                  const index = hits.indexOf(hit)
                  return (
                    <button
                      key={`${hit.module}-${hit.id}`}
                      type="button"
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => open(hit)}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                        index === activeIndex && 'bg-card-alt',
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-ink">{hit.label}</span>
                        {hit.sublabel ? (
                          <span className="block truncate text-[11px] text-ink-3">{hit.sublabel}</span>
                        ) : null}
                      </span>
                      {index === activeIndex ? <CornerDownLeft size={13} className="shrink-0 text-ink-3" /> : null}
                    </button>
                  )
                })}
              </div>
            ))
          )}

          {aiAnswer ? (
            <div
              className="m-3 rounded-xl border p-3"
              style={{ borderColor: 'var(--accent-border)', background: 'var(--accent-glow)' }}
            >
              <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-accent-light">
                <Sparkles size={12} /> {AI_BRAND.short}
              </p>
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-ink-2">{aiAnswer}</p>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5">
          <p className="hidden text-[11px] text-ink-3 sm:block">↑↓ to navigate • ↵ to open • Esc to close</p>
          <button
            type="button"
            className="nl-btn nl-btn-ghost h-9 min-h-0 text-xs"
            onClick={() => void askAi()}
            disabled={aiLoading || term.trim().length < 2}
          >
            <Sparkles size={13} />
            {aiLoading ? 'Thinking…' : 'Ask AI Assistance'}
          </button>
        </div>
      </div>
    </div>
  )
}
