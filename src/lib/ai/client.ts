import { getSupabase } from '@/lib/supabase'
import { AI_BRAND } from '@/constants'
import type { SmartInsight } from '@/types'

/**
 * NegoLinks Intelligence Engine — client facade.
 *
 * The browser never holds a provider key and never learns which provider
 * answered. Every request is posted to the `ai-gateway` Edge Function, which
 * decrypts the org's key, routes to the right model for the task and writes an
 * AI audit entry. When no backend is attached the engine falls back to grounded
 * analysis computed from the data already loaded in the page, so the assistant
 * still gives real answers about real records during evaluation.
 */

export type AITask =
  | 'chat'
  | 'document_generation'
  | 'analysis'
  | 'summarization'
  | 'complex_reasoning'
  | 'insight'

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIRequest {
  messages: AIMessage[]
  module: string
  task?: AITask
  context?: string
  temperature?: number
  maxTokens?: number
}

export interface AIResult {
  text: string
  grounded: boolean
}

export const AI_UNAVAILABLE_MESSAGE =
  'AI Assistance is not reachable at the moment. Your data is safe — please try again shortly.'

export const aiClient = {
  async chat(request: AIRequest): Promise<AIResult> {
    const sb = getSupabase()
    if (!sb) return { text: localReasoner(request), grounded: true }
    try {
      const { data, error } = await sb.functions.invoke<{ text: string }>('ai-gateway', {
        body: {
          action: 'chat',
          module: request.module,
          task: request.task ?? 'chat',
          messages: request.messages,
          context: request.context ?? '',
          temperature: request.temperature,
          max_tokens: request.maxTokens,
        },
      })
      if (error || !data?.text) return { text: localReasoner(request), grounded: true }
      return { text: data.text, grounded: false }
    } catch {
      return { text: localReasoner(request), grounded: true }
    }
  },

  /** Smart Insights for a dashboard. Never blocks first paint. */
  async insights(module: string, context: string, fallback: SmartInsight[]): Promise<SmartInsight[]> {
    const sb = getSupabase()
    if (!sb) return fallback
    try {
      const { data, error } = await sb.functions.invoke<{ insights: SmartInsight[] }>('ai-gateway', {
        body: { action: 'insights', module, context },
      })
      if (error || !data?.insights?.length) return fallback
      return data.insights.slice(0, 5)
    } catch {
      return fallback
    }
  },

  /** Long-form drafting used by the document engine and report narratives. */
  async draft(prompt: string, module: string, context: string): Promise<string> {
    const result = await this.chat({
      module,
      task: 'document_generation',
      context,
      messages: [
        {
          role: 'system',
          content:
            'You are the executive assistant of a nonprofit organization. Write clear, professional, donor-ready prose. Use only the organizational data supplied. Never invent figures.',
        },
        { role: 'user', content: `${prompt}\n\nORGANIZATIONAL DATA:\n${context}` },
      ],
    })
    return result.text
  },
}

/**
 * Deterministic on-device analysis. It answers from the structured context the
 * caller already assembled, so responses stay truthful even with no provider.
 */
const localReasoner = (request: AIRequest): string => {
  const question = [...request.messages].reverse().find((m) => m.role === 'user')?.content ?? ''
  const context = request.context ?? ''
  const lines = context
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (!lines.length) {
    return `${AI_BRAND.platform} is running in on-device mode. Connect the organization's AI platform under Settings › AI Platform for full generative analysis. In the meantime, open any module dashboard and the figures shown there are live.`
  }

  const keywords = question
    .toLowerCase()
    .replace(/[^a-z0-9\s%]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3)

  const scored = lines
    .map((line) => {
      const lower = line.toLowerCase()
      const score = keywords.reduce((total, word) => total + (lower.includes(word) ? 1 : 0), 0)
      return { line, score }
    })
    .sort((a, b) => b.score - a.score)

  const relevant = scored.filter((row) => row.score > 0).slice(0, 8)
  const chosen = (relevant.length ? relevant : scored.slice(0, 8)).map((row) => row.line)

  const heading = relevant.length
    ? 'Here is what the current organizational data shows:'
    : 'Here is a summary of the current organizational position:'

  return [
    heading,
    '',
    ...chosen.map((line) => `• ${line}`),
    '',
    'Figures are read live from your authorized records. For narrative drafting and forecasting, connect the AI platform under Settings › AI Platform.',
  ].join('\n')
}

/** Suggested prompt chips shown when the Executive Assistant is empty. */
export const SUGGESTED_PROMPTS: Record<string, string[]> = {
  dashboard: [
    'Which projects are currently underperforming?',
    'Show me grants expiring within 90 days.',
    'Generate an executive summary of our activities this quarter.',
    'Identify projects with significant budget variance.',
  ],
  projects: [
    'Which projects are behind schedule?',
    'Summarize progress on our education portfolio.',
    'What are the top risks across active projects?',
  ],
  grants: [
    'Show me grants expiring within 90 days.',
    'Which donor reports are overdue?',
    'What is our grant pipeline value by stage?',
  ],
  donors: [
    'Which donor contributed the most this year?',
    'Draft a thank-you letter to our top donor.',
    'Which donors have lapsed in the last 12 months?',
  ],
  finance: [
    'What percentage of the education project budget has been utilized?',
    'Identify budget lines with significant variance.',
    'Summarize restricted versus unrestricted fund balances.',
  ],
  mel: [
    'Which indicators are below target?',
    'Summarize outcome performance for this year.',
    'Draft a learning brief from our latest evaluation.',
  ],
  beneficiaries: [
    'What is the gender breakdown of beneficiaries reached?',
    'Which communities have the highest enrollment?',
    'Summarize vulnerability categories across our caseload.',
  ],
}

export const promptsFor = (module: string): string[] =>
  SUGGESTED_PROMPTS[module] ?? SUGGESTED_PROMPTS.dashboard ?? []
