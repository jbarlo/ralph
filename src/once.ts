import { readFileSync, existsSync } from 'node:fs'
import { resolveState } from './state.js'
import { readTickets, pickNext } from './tickets.js'
import { runRalphContainer } from './sandcastle.js'
import { inGitRepo, currentCommit, checkpointCommit } from './git.js'
import { dispatchEvent } from './hooks-dispatch.js'
import { startPayload, completePayload, errorPayload, extractLastProgressEntry } from './hooks-payloads.js'

export async function runOnce(): Promise<number> {
  if (!inGitRepo()) {
    console.error('Error: ralph must run inside a git repository')
    return 1
  }

  const state = resolveState()
  const beforeR = readTickets(state.tickets)
  if (!beforeR.ok) {
    console.error(beforeR.error)
    return 1
  }
  const beforeTicket = pickNext(beforeR.value)
  const beforeId = beforeTicket?.id

  dispatchEvent('on-start', startPayload(beforeTicket))

  const exit = await runRalphContainer()
  checkpointCommit()

  const afterR = readTickets(state.tickets)
  if (!afterR.ok) {
    console.error(afterR.error)
    return 1
  }
  const afterTicket = beforeId != null ? afterR.value.tickets.find(t => t.id === beforeId) : undefined
  const commit = currentCommit()

  if (exit === 0 && afterTicket?.status === 'completed') {
    const summary = existsSync(state.progress)
      ? extractLastProgressEntry(readFileSync(state.progress, 'utf8'))
      : ''
    dispatchEvent('on-complete', completePayload(afterTicket, summary, commit))
  } else if (beforeId != null) {
    dispatchEvent('on-error', errorPayload(afterTicket ?? beforeTicket, exit, commit))
  }

  return exit
}
