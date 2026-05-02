import { existsSync, realpathSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { ok, err, type Result } from './lib/result.js'

export type StatePaths = {
  root: string
  tickets: string
  progress: string
  hooksDir: string
  logsDir: string
}

export function findRalphRoot(cwd: string): string | undefined {
  if (process.env.RALPH_PROJECT_DIR) return process.env.RALPH_PROJECT_DIR

  let dir: string
  try {
    dir = realpathSync(cwd)
  } catch {
    dir = cwd
  }

  while (true) {
    if (existsSync(join(dir, '.ralph'))) return dir
    const parent = dirname(dir)
    if (parent === dir) return undefined
    dir = parent
  }
}

/**
 * Build StatePaths from an already-known project root. Caller is responsible
 * for having found the root via requireProject (the canonical entry point for
 * "find a project from cwd"). Don't call this with a raw cwd to bypass the
 * project check — that's how root-finding logic gets reached around.
 */
export function statePathsFromRoot(root: string): StatePaths {
  const dotRalph = join(root, '.ralph')
  return {
    root,
    tickets: join(dotRalph, 'tickets.json'),
    progress: join(dotRalph, 'progress.txt'),
    hooksDir: join(dotRalph, 'hooks.d'),
    logsDir: join(dotRalph, 'logs'),
  }
}

export function requireProject(cwd: string = process.cwd()): Result<StatePaths, string> {
  const projectRoot = findRalphRoot(cwd)
  if (!projectRoot) return err('not in a ralph project (no .ralph/ in any parent)', 1)
  return ok(statePathsFromRoot(projectRoot))
}
