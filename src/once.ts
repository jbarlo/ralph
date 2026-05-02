import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { requireProject } from './state.js'
import { readTickets, pickNext } from './tickets.js'
import { runRalphContainer } from './sandcastle.js'
import { inGitRepo, currentCommit, checkpointCommit } from './git.js'
import { dispatchEvent } from './hooks-dispatch.js'
import { startPayload, completePayload, errorPayload } from './hooks-payloads.js'
import { readProgressSummary } from './progress.js'
import { ok, err, type Result } from './lib/result.js'
import { buildLogFilename } from './log-path.js'

export async function runOnce(log = false): Promise<Result<string, string>> {
  if (process.env.RALPH_IN_SANDBOX) return err('cannot nest ralph inside sandbox', 1)
  if (!inGitRepo()) return err('ralph must run inside a git repository', 1)

  const stateR = requireProject()
  if (!stateR.ok) return stateR
  const state = stateR.value
  const beforeR = readTickets(state.tickets)
  if (!beforeR.ok) return beforeR
  const beforeTicket = pickNext(beforeR.value)
  const beforeId = beforeTicket?.id

  dispatchEvent('on-start', startPayload(beforeTicket), state)

  let logFile: string | undefined
  if (log) {
    mkdirSync(state.logsDir, { recursive: true })
    logFile = join(state.logsDir, buildLogFilename({ ticketId: beforeId }))
    console.log(`Logging to: ${logFile}`)
  }

  const exit = await runRalphContainer({ logFile })
  checkpointCommit()

  const afterR = readTickets(state.tickets)
  if (!afterR.ok) return afterR
  const afterTicket = beforeId != null ? afterR.value.tickets.find(t => t.id === beforeId) : undefined
  const commit = currentCommit()

  if (exit === 0 && afterTicket?.status === 'completed') {
    const summaryR = readProgressSummary(state.progress)
    if (!summaryR.ok) return summaryR
    dispatchEvent('on-complete', completePayload(afterTicket, summaryR.value, commit), state)
  } else if (beforeId != null) {
    dispatchEvent('on-error', errorPayload(afterTicket ?? beforeTicket, exit, commit), state)
  }

  if (exit !== 0) return err('', exit)
  return ok('')
}
