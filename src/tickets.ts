import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { ok, err, type Result } from './lib/result.js'

export type TicketStatus = 'draft' | 'pending' | 'in_progress' | 'completed' | 'failed'

export type Ticket = {
  id: number
  title: string
  description: string
  status: TicketStatus
  priority: number
}

export type TicketsFile = { tickets: Ticket[] }

export function readTickets(path: string): Result<TicketsFile, string> {
  if (!existsSync(path)) return ok({ tickets: [] })
  let raw: string
  try {
    raw = readFileSync(path, 'utf8')
  } catch (e) {
    return err(`Failed to read ${path}: ${e instanceof Error ? e.message : String(e)}`, 1)
  }
  try {
    return ok(JSON.parse(raw) as TicketsFile)
  } catch (e) {
    return err(`Failed to parse ${path}: ${e instanceof Error ? e.message : String(e)}`, 1)
  }
}

export function writeTickets(path: string, data: TicketsFile): Result<void, string> {
  try {
    writeFileSync(path, JSON.stringify(data, null, 2) + '\n')
    return ok(undefined)
  } catch (e) {
    return err(`Failed to write ${path}: ${e instanceof Error ? e.message : String(e)}`, 1)
  }
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
