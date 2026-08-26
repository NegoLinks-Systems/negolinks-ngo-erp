import { useEffect, useMemo, useRef, useState, type FC } from 'react'
import { Copy, RefreshCw, Send, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'
import { aiClient, promptsFor, type AIMessage } from '@/lib/ai/client'
import { AI_BRAND } from '@/constants'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/app.store'
import type { SmartInsight } from '@/types'
import { Badge, EmptyState } from '@/components/negolinks/Primitives'

interface ChatEntry {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface AIPanelProps {
  isOpen: boolean
  onClose: () => void
  module: string
  context: string
}

export const AIPanel: FC<AIPanelProps> = ({ isOpen, onClose, module, context }) => {
  const [entries, setEntries] = useState<ChatEntry[]>([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const organization = useAppStore((state) => state.organization)
  const aiEnabled = useAppStore((state) => state.featureFlags.ai_executive_assistant)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [entries, thinking])

  useEffect(() => {
    if (!isOpen) return
    const handler = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const send = async (question: string): Promise<void> => {
    const trimmed = question.trim()
    if (!trimmed || thinking) return
    const userEntry: ChatEntry = { id: `u-${Date.now()}`, role: 'user', content: trimmed }
    setEntries((current) => [...current, userEntry])
    setInput('')
    setThinking(true)

    const history: AIMessage[] = [
      {
        role: 'system',
        content: `You are the Executive Assistant for ${organization?.name ?? 'the organization'}, a nonprofit using an enterprise management platform. Answer only from the organizational data supplied. Be concise, professional and specific. Never mention which AI provider or model you are.`,
      },
      ...entries.map((entry) => ({ role: entry.role, content: entry.content }) as AIMessage),
      { role: 'user', content: trimmed },
    ]

    try {
      const result = await aiClient.chat({ messages: history, module, context })
      setEntries((current) => [
        ...current,
        { id: `a-${Date.now()}`, role: 'assistant', content: result.text },
      ])
    } catch {
      setEntries((current) => [
        ...current,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: 'AI Assistance could not complete that request. Please try again.',
        },
      ])
    } finally {
      setThinking(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <button
        type="button"
        aria-label="Close assistant"
        className="absolute inset-0"
        style={{ background: 'var(--overlay)' }}
        onClick={onClose}
      />
      <aside
        className="relative flex h-full w-full max-w-md animate-slide-in flex-col border-l border-line bg-surface"
        role="dialog"
        aria-label={AI_BRAND.assistant}
      >
        <header className="flex items-start justify-between gap-3 border-b border-line p-4">
          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: 'var(--accent-glow)', color: 'var(--accent-primary)' }}
            >
              <Sparkles size={19} />
            </span>
            <div>
              <h2 className="nl-accent-text font-display text-sm font-bold">✦ {AI_BRAND.platform}</h2>
              <p className="text-xs text-ink-3">{AI_BRAND.assistant}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-card-alt hover:text-ink"
          >
            <X size={18} />
          </button>
        </header>

        {!aiEnabled ? (
          <div className="flex-1 p-6">
            <EmptyState
              icon={Sparkles}
              title="AI Assistance is switched off"
              description="An administrator has disabled the Executive Assistant for this organization. It can be re-enabled under Settings › Feature Management."
            />
          </div>
        ) : (
          <>
            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
              {entries.length === 0 ? (
                <div>
                  <p className="mb-3 text-sm text-ink-2">
                    Ask about projects, grants, donors, budgets, beneficiaries or impact. Answers use your
                    authorized organizational data.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {promptsFor(module).map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => void send(prompt)}
                        className="rounded-full border px-3 py-1.5 text-left text-xs transition-colors"
                        style={{ borderColor: 'var(--accent-border)', color: 'var(--accent-light)' }}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                entries.map((entry) => (
                  <div
                    key={entry.id}
                    className={cn('flex flex-col gap-1', entry.role === 'user' ? 'items-end' : 'items-start')}
                  >
                    <div
                      className={cn(
                        'max-w-[92%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                        entry.role === 'user' ? 'text-white' : 'border border-line bg-card text-ink-2',
                      )}
                      style={
                        entry.role === 'user'
                          ? { background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-deep))' }
                          : undefined
                      }
                    >
                      {entry.content}
                    </div>
                    {entry.role === 'assistant' ? (
                      <button
                        type="button"
                        className="flex items-center gap-1 text-[11px] text-ink-3 transition-colors hover:text-accent-light"
                        onClick={() => {
                          void navigator.clipboard.writeText(entry.content)
                          toast.success('Copied to clipboard')
                        }}
                      >
                        <Copy size={11} /> Copy
                      </button>
                    ) : null}
                  </div>
                ))
              )}
              {thinking ? (
                <div className="flex items-center gap-2 text-xs text-ink-3">
                  <span className="flex gap-1">
                    {[0, 1, 2].map((dot) => (
                      <span
                        key={dot}
                        className="h-1.5 w-1.5 animate-pulse rounded-full"
                        style={{ background: 'var(--accent-primary)', animationDelay: `${dot * 0.15}s` }}
                      />
                    ))}
                  </span>
                  Analysing your data…
                </div>
              ) : null}
            </div>

            <footer className="border-t border-line p-3">
              <div className="flex items-end gap-2">
                <textarea
                  className="nl-input max-h-32 min-h-[44px] resize-none py-2.5"
                  rows={1}
                  placeholder="Ask AI Assistance…"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      void send(input)
                    }
                  }}
                />
                <button
                  type="button"
                  className="nl-btn nl-btn-primary h-11 w-11 shrink-0 p-0"
                  onClick={() => void send(input)}
                  disabled={thinking || !input.trim()}
                  aria-label="Send"
                >
                  <Send size={16} />
                </button>
              </div>
              <p className="mt-2 text-center text-[10px] text-ink-3">Powered by {AI_BRAND.platform}</p>
            </footer>
          </>
        )}
      </aside>
    </div>
  )
}

/* -------------------------------------------------- Smart Insights widget */

interface AIInsightsPanelProps {
  module: string
  context: string
  fallback: SmartInsight[]
  onOpenAssistant?: () => void
  className?: string
}

const CATEGORY_TONE: Record<SmartInsight['category'], 'accent' | 'danger' | 'warning' | 'success' | 'info'> = {
  Alert: 'danger',
  Risk: 'warning',
  Forecast: 'info',
  Opportunity: 'success',
  Funding: 'accent',
  Impact: 'success',
}

export const AIInsightsPanel: FC<AIInsightsPanelProps> = ({
  module,
  context,
  fallback,
  onOpenAssistant,
  className,
}) => {
  const [insights, setInsights] = useState<SmartInsight[]>(fallback)
  const [loading, setLoading] = useState(false)
  const enabled = useAppStore((state) => state.featureFlags.ai_smart_insights)
  const contextKey = useMemo(() => context.slice(0, 400), [context])

  const refresh = async (): Promise<void> => {
    if (!enabled) return
    setLoading(true)
    try {
      const result = await aiClient.insights(module, context, fallback)
      setInsights(result)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setInsights(fallback)
    if (!enabled) return
    // Non-blocking: the dashboard renders first, insights fill in afterwards.
    let cancelled = false
    void aiClient.insights(module, contextKey, fallback).then((result) => {
      if (!cancelled) setInsights(result)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextKey, module, enabled])

  return (
    <section
      className={cn('nl-card flex flex-col p-5', className)}
      style={{ borderLeft: '4px solid var(--accent-primary)' }}
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-display text-sm font-bold text-ink">
          <Sparkles size={15} style={{ color: 'var(--accent-primary)' }} />
          {AI_BRAND.insights}
        </h3>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading || !enabled}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-card-alt hover:text-ink"
          aria-label="Refresh insights"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : undefined} />
        </button>
      </header>

      {!enabled ? (
        <p className="text-xs text-ink-3">Smart Insights are disabled for this organization.</p>
      ) : (
        <ul className="flex-1 space-y-3">
          {insights.slice(0, 5).map((insight) => (
            <li key={insight.id} className="border-b border-line pb-3 last:border-0 last:pb-0">
              <div className="mb-1 flex items-center gap-2">
                <Badge tone={CATEGORY_TONE[insight.category]}>{insight.category}</Badge>
                <span className="truncate text-xs font-semibold text-ink">{insight.title}</span>
              </div>
              <p className="text-xs leading-relaxed text-ink-2">{insight.detail}</p>
            </li>
          ))}
          {insights.length === 0 ? (
            <li className="text-xs text-ink-3">
              Insights appear once your organization has data. Load demo data or create your first records.
            </li>
          ) : null}
        </ul>
      )}

      {onOpenAssistant ? (
        <button type="button" className="nl-btn nl-btn-ghost mt-4 w-full" onClick={onOpenAssistant}>
          View Full Analysis
        </button>
      ) : null}
    </section>
  )
}
