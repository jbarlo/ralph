import { spawnSync } from 'node:child_process'

export function inGitRepo(): boolean {
  const r = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { stdio: 'ignore' })
  return r.status === 0
}

export function currentCommit(): string {
  const r = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' })
  return r.status === 0 ? r.stdout.trim() : ''
}

/**
 * Commit any leftover changes the agent didn't commit itself, so nothing is
 * lost if the iteration ended unexpectedly. No-op when the working tree is clean.
 */
export function checkpointCommit(): void {
  spawnSync('git', ['add', '-A'], { stdio: 'ignore' })
  const stamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
  spawnSync('git', ['commit', '-m', `chore: ralph checkpoint ${stamp}`], { stdio: 'ignore' })
}
