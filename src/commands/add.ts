import { requireProject } from '../state.js'
import { readTickets, writeTickets, nextId } from '../tickets.js'
import { ok, type Result } from '../lib/result.js'

export function addTicket(
  title: string,
  priority: number,
  description: string,
  cwd?: string,
): Result<string, string> {
  const stateR = requireProject(cwd)
  if (!stateR.ok) return stateR
  const { tickets: path } = stateR.value
  const file = readTickets(path)
  if (!file.ok) return file
  const id = nextId(file.value)
  file.value.tickets.push({ id, title, description, status: 'pending', priority })
  const write = writeTickets(path, file.value)
  if (!write.ok) return write
  return ok(`Added #${id}: ${title} (priority: ${priority})`)
}
