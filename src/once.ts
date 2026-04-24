import { resolveState } from './state.js'
import { readTickets, pickNext } from './tickets.js'
import { runRalphContainer } from './sandcastle.js'
import { inGitRepo, currentCommit, checkpointCommit } from './git.js'
import { dispatchEvent } from './hooks-dispatch.js'
import { startPayload, completePayload, errorPayload } from './hooks-payloads.js'
import { readProgressSummary } from './progress.js'
import { ok, err, type Result } from './lib/result.js'

export async function runOnce(): Promise<Result<string, string>> {
  if (!inGitRepo()) return err('ralph must run inside a git repository', 1)

  const state = resolveState()
  const beforeR = readTickets(state.tickets)
  if (!beforeR.ok) return beforeR
  const beforeTicket = pickNext(beforeR.value)
  const beforeId = beforeTicket?.id

  dispatchEvent('on-start', startPayload(beforeTicket))

  const exit = await runRalphContainer()
  checkpointCommit()

  const afterR = readTickets(state.tickets)
  if (!afterR.ok) return afterR
  const afterTicket = beforeId != null ? afterR.value.tickets.find(t => t.id === beforeId) : undefined
  const commit = currentCommit()

  if (exit === 0 && afterTicket?.status === 'completed') {
    const summaryR = readProgressSummary(state.progress)
    if (!summaryR.ok) return summaryR
    dispatchEvent('on-complete', completePayload(afterTicket, summaryR.value, commit))
  } else if (beforeId != null) {
    dispatchEvent('on-error', errorPayload(afterTicket ?? beforeTicket, exit, commit))
  }

  if (exit !== 0) return err('', exit)
  return ok('')
}
