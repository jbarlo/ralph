import { readFileSync, existsSync } from 'node:fs'
import { resolveState } from './state.js'
import { readTickets, pickNext } from './tickets.js'
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

export async function runOnce(): Promise<number> {
  if (!inGitRepo()) {
    console.error('Error: ralph must run inside a git repository')
    return 1
  }

  console.log('Verifying claude auth...')
  const auth = verifyClaudeAuth(false)
  if (!auth.ok) {
    console.error('Error: claude auth check failed. Check your credentials.')
    if (auth.stderr) console.error(auth.stderr.trim())
    return 1
  }
  console.log('Auth OK. Running one ticket...')

  const state = resolveState()
  const before = readTickets(state.tickets)
  const beforeTicket = pickNext(before)
  const beforeId = beforeTicket?.id

  dispatchEvent('on-start', startPayload(beforeTicket))

  if (ralphContainerRunning()) {
    console.error("Error: Container 'ralph' is already running. Run 'ralph stop' to stop it.")
    return 1
  }
  removeExitedRalphContainer()

  const exit = runRalphContainer({ loop: false })

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

  return exit
}
