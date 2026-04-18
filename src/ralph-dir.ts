import { realpathSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'

let cached: string | undefined

/**
 * The binary is expected to live at the repo root, alongside the Dockerfile,
 * so the repo path is `dirname(realpath(execPath))`. Override via RALPH_DIR.
 */
export function ralphDir(): string {
  if (cached) return cached
  if (process.env.RALPH_DIR) {
    cached = process.env.RALPH_DIR
    return cached
  }
  const exe = realpathSync(process.execPath)
  const dir = dirname(exe)
  if (existsSync(join(dir, 'Dockerfile'))) {
    cached = dir
    return cached
  }
  throw new Error(
    `Cannot locate ralph repo from executable at ${exe}. Set RALPH_DIR env var to the path of the ralph checkout.`,
  )
}
