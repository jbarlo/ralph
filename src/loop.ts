import { readFileSync, existsSync } from 'node:fs'
import { resolveState } from './state.js'
import { readTickets, pickNext, remaining } from './tickets.js'
import {
  inGitRepo,
  verifyClaudeAuth,
  ralphContainerRunning,
  removeExitedRalphContainer,
  runRalphContainer,
  currentCommit,
} from './docker.js'
import { dispatchEvent } from './hooks-dispatch.js'
import { startPayload, completePayload, errorPayload, extractLastProgressEntry } from './hooks-payloads.js'

export async function runLoop(maxIter: number): Promise<number> {
  if (!inGitRepo()) {
    console.error('Error: ralph must run inside a git repository')
    return 1
  }

  console.log('Verifying claude auth...')
  const auth = verifyClaudeAuth(true)
  if (!auth.ok) {
    console.error('Error: claude auth check failed. Check your credentials.')
    if (auth.stderr) console.error(auth.stderr.trim())
    return 1
  }
  console.log(`Auth OK. Starting ralph loop (max ${maxIter} iterations)...`)

  for (let i = 1; i <= maxIter; i++) {
    console.log('')
    console.log(`=== Iteration ${i}/${maxIter} ===`)

    const state = resolveState()
    const file = readTickets(state.tickets)

    if (remaining(file) === 0) {
      console.log('All tickets complete!')
      return 0
    }
    console.log(`Remaining tickets: ${remaining(file)}`)

    const beforeTicket = pickNext(file)
    const beforeId = beforeTicket?.id

    dispatchEvent('on-start', startPayload(beforeTicket))

    if (ralphContainerRunning()) {
      console.error("Error: Container 'ralph' is already running. Run 'ralph stop' to stop it.")
      return 1
    }
    removeExitedRalphContainer()

    const exit = runRalphContainer({ loop: true })

    const after = readTickets(state.tickets)
    const afterTicket = beforeId != null ? after.tickets.find(t => t.id === beforeId) : undefined
    const commit = currentCommit()

    if (exit === 0 && afterTicket?.status === 'completed') {
      const summary = existsSync(state.progress)
        ? extractLastProgressEntry(readFileSync(state.progress, 'utf8'))
        : ''
      dispatchEvent('on-complete', completePayload(afterTicket, summary, commit))
    } else if (beforeId != null) {
      dispatchEvent('on-error', errorPayload(afterTicket ?? beforeTicket, exit, commit))
    }
  }

  console.log('')
  console.log(`=== Max iterations (${maxIter}) reached ===`)
  console.log('Some tickets may still be incomplete.')
  return 0
}
