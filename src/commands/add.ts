import { resolveState } from '../state.js'
import { readTickets, writeTickets, nextId } from '../tickets.js'

export function addTicket(title: string, priority: number, description: string, cwd?: string): string {
  const { tickets: path } = resolveState(cwd)
  const file = readTickets(path)
  const id = nextId(file)
  file.tickets.push({ id, title, description, status: 'pending', priority })
  writeTickets(path, file)
  return `Added #${id}: ${title} (priority: ${priority})`
}
