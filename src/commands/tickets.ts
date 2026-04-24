import { resolveState } from '../state.js'
import { readTickets, type Ticket, type TicketStatus } from '../tickets.js'
import { ok, type Result } from '../lib/result.js'

export type TicketsMode = 'pending' | 'done' | 'failed' | 'draft' | 'all'

export function listTickets(
  mode: TicketsMode,
  idsOnly = false,
  cwd?: string,
): Result<string, string> {
  const { tickets: path } = resolveState(cwd)
  const fileR = readTickets(path)
  if (!fileR.ok) return fileR
  const file = fileR.value
  let filtered: Ticket[]
  switch (mode) {
    case 'pending':
      filtered = file.tickets.filter(t => t.status === 'pending' || t.status === 'in_progress')
      break
    case 'done':
      filtered = file.tickets.filter(t => t.status === 'completed')
      break
    case 'failed':
      filtered = file.tickets.filter(t => t.status === 'failed')
      break
    case 'draft':
      filtered = file.tickets.filter(t => t.status === 'draft')
      break
    case 'all':
      filtered = file.tickets
      break
  }
  if (idsOnly) return ok(filtered.map(t => String(t.id)).join('\n'))
  return ok(filtered.map(t => formatTicket(t, mode)).join('\n'))
}

function formatTicket(t: Ticket, mode: TicketsMode): string {
  if (mode === 'done' || mode === 'failed') return `#${t.id}: ${t.title}`
  if (mode === 'all') {
    const s = statusInitial(t.status)
    return `[${s}] #${t.id}: ${t.title}`
  }
  const ip = t.status === 'in_progress' ? ' (in progress)' : ''
  const desc = t.description ? `\n    ${t.description}` : ''
  return `[${t.priority}] #${t.id}: ${t.title}${ip}${desc}`
}

function statusInitial(s: TicketStatus): string {
  return s.charAt(0)
}
