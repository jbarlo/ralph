import { join } from 'node:path'

export type StatePaths = {
  tickets: string
  progress: string
  hooksDir: string
  logsDir: string
}

export function resolveState(cwd: string = process.cwd()): StatePaths {
  const root = join(cwd, '.ralph')
  return {
    tickets: join(root, 'tickets.json'),
    progress: join(root, 'progress.txt'),
    hooksDir: join(root, 'hooks.d'),
    logsDir: join(root, 'logs'),
  }
}
