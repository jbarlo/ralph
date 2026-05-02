import { existsSync, realpathSync } from 'node:fs'
import { join, dirname, parse as parsePath } from 'node:path'
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

export function resolveState(cwd: string = process.cwd()): StatePaths {
  const projectRoot = findRalphRoot(cwd) ?? cwd
  const root = join(projectRoot, '.ralph')
  return {
    root: projectRoot,
    tickets: join(root, 'tickets.json'),
    progress: join(root, 'progress.txt'),
    hooksDir: join(root, 'hooks.d'),
    logsDir: join(root, 'logs'),
  }
}

export function requireProject(cwd: string = process.cwd()): Result<StatePaths, string> {
  const projectRoot = findRalphRoot(cwd)
  if (!projectRoot) return err('not in a ralph project (no .ralph/ in any parent)', 1)
  return ok(resolveState(projectRoot))
}
