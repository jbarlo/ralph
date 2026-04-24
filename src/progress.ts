import { existsSync, readFileSync } from 'node:fs'
import { ok, err, type Result } from './lib/result.js'
import { extractLastProgressEntry } from './hooks-payloads.js'

export function readProgressSummary(path: string): Result<string, string> {
  if (!existsSync(path)) return ok('')
  try {
    return ok(extractLastProgressEntry(readFileSync(path, 'utf8')))
  } catch (e) {
    return err(`Failed to read ${path}: ${e instanceof Error ? e.message : String(e)}`, 1)
  }
}
