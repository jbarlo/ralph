import { readFileSync, writeFileSync, existsSync } from 'node:fs'

export type TicketStatus = 'draft' | 'pending' | 'in_progress' | 'completed' | 'failed'

export type Ticket = {
  id: number
  title: string
  description: string
  status: TicketStatus
  priority: number
}

export type TicketsFile = { tickets: Ticket[] }

export function readTickets(path: string): TicketsFile {
  if (!existsSync(path)) return { tickets: [] }
  return JSON.parse(readFileSync(path, 'utf8'))
}

export function writeTickets(path: string, data: TicketsFile): void {
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n')
}

export function nextId(file: TicketsFile): number {
  if (file.tickets.length === 0) return 1
  return Math.max(...file.tickets.map(t => t.id)) + 1
}

export function pickNext(file: TicketsFile): Ticket | undefined {
  const active = file.tickets.filter(t => t.status === 'pending' || t.status === 'in_progress')
  if (active.length === 0) return undefined
  return active.sort((a, b) => a.priority - b.priority)[0]
}

export function remaining(file: TicketsFile): number {
  return file.tickets.filter(t => t.status === 'pending' || t.status === 'in_progress').length
}
