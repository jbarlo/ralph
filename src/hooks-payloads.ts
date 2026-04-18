import type { Ticket } from './tickets.js'

type BasePayload = {
  timestamp: string
  commit?: string
}

export type StartPayload = BasePayload & {
  event: 'start'
  ticket: Ticket | null
}

export type CompletePayload = BasePayload & {
  event: 'complete'
  ticket: Ticket | null
  summary: string
}

export type ErrorPayload = BasePayload & {
  event: 'error'
  ticket: Ticket | null
  exit_code: number
}

export function now(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
}

export function startPayload(ticket: Ticket | undefined): StartPayload {
  return { event: 'start', ticket: ticket ?? null, timestamp: now() }
}

export function completePayload(ticket: Ticket | undefined, summary: string, commit: string): CompletePayload {
  return { event: 'complete', ticket: ticket ?? null, summary, timestamp: now(), commit }
}

export function errorPayload(ticket: Ticket | undefined, exitCode: number, commit: string): ErrorPayload {
  return { event: 'error', ticket: ticket ?? null, exit_code: exitCode, timestamp: now(), commit }
}

export function extractLastProgressEntry(progressText: string): string {
  const lines = progressText.split('\n')
  let startIdx = -1
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].startsWith('## Ticket #')) {
      startIdx = i
      break
    }
  }
  if (startIdx === -1) return ''
  const entry = lines.slice(startIdx).join('\n')
  return entry.slice(-2000)
}
