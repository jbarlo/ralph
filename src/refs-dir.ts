import envPaths from 'env-paths'
import { join } from 'node:path'
import { findRalphRoot } from './state.js'

export function globalRefsDir(): string {
  if (process.env.RALPH_GLOBAL_DIR) return join(process.env.RALPH_GLOBAL_DIR, 'refs')
  return join(envPaths('ralph', { suffix: '' }).config, 'refs')
}

export function projectRefsDir(cwd: string = process.cwd()): string {
  const root = findRalphRoot(cwd) ?? cwd
  return join(root, '.ralph', 'refs')
}
