import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { resolveState } from './state.js'
import { readTickets, pickNext, remaining } from './tickets.js'
import { runRalphContainer } from './sandcastle.js'
import { inGitRepo, currentCommit, checkpointCommit } from './git.js'
import { dispatchEvent } from './hooks-dispatch.js'
import { startPayload, completePayload, errorPayload } from './hooks-payloads.js'
import { readProgressSummary } from './progress.js'
import { ok, err, type Result } from './lib/result.js'
import { buildLogFilename } from './log-path.js'

export async function runLoop(maxIter: number, log = false): Promise<Result<string, string>> {
  if (process.env.RALPH_IN_SANDBOX) return err('cannot nest ralph inside sandbox', 1)
  if (!inGitRepo()) return err('ralph must run inside a git repository', 1)

  console.log(`Starting ralph loop (max ${maxIter} iterations)...`)

  for (let i = 1; i <= maxIter; i++) {
    console.log('')
    console.log(`=== Iteration ${i}/${maxIter} ===`)

    const state = resolveState()
    const fileR = readTickets(state.tickets)
    if (!fileR.ok) return fileR

    if (remaining(fileR.value) === 0) {
      console.log('All tickets complete!')
      return ok('')
    }
    console.log(`Remaining tickets: ${remaining(fileR.value)}`)

    const beforeTicket = pickNext(fileR.value)
    const beforeId = beforeTicket?.id

    dispatchEvent('on-start', startPayload(beforeTicket))

    let logFile: string | undefined
    if (log) {
      mkdirSync(state.logsDir, { recursive: true })
      logFile = join(state.logsDir, buildLogFilename({ iteration: i, ticketId: beforeId }))
      console.log(`Logging iteration ${i} to: ${logFile}`)
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
      dispatchEvent('on-complete', completePayload(afterTicket, summaryR.value, commit))
    } else if (beforeId != null) {
      dispatchEvent('on-error', errorPayload(afterTicket ?? beforeTicket, exit, commit))
    }
  }

  console.log('')
  console.log(`=== Max iterations (${maxIter}) reached ===`)
  console.log('Some tickets may still be incomplete.')
  return ok('')
}
