import { existsSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { resolveState } from './state.js'
import { VALID_EVENTS, type HookEvent } from './commands/hooks.js'

type DispatchResult = { event: HookEvent; failed: string[] }

export function dispatchEvent(event: HookEvent, payload: unknown, cwd?: string): DispatchResult {
  const dir = join(resolveState(cwd).hooksDir, event)
  if (!existsSync(dir)) return { event, failed: [] }

  const failed: string[] = []
  const entries = readdirSync(dir).sort().filter(n => n !== '.gitkeep')
  const payloadJson = JSON.stringify(payload)

  const tmp = mkdtempSync(join(tmpdir(), 'ralph-hook-'))
  const payloadFile = join(tmp, 'payload.json')
  writeFileSync(payloadFile, payloadJson)

  try {
    for (const name of entries) {
      const hookPath = join(dir, name)
      const st = statSync(hookPath)
      if ((st.mode & 0o111) === 0) continue
      console.log(`Running hook: ${name}`)
      const result = spawnSync(hookPath, [], {
        input: payloadJson,
        env: {
          ...process.env,
          RALPH_HOOK_EVENT: event,
          RALPH_HOOK_CONTEXT_FILE: payloadFile,
        },
        stdio: ['pipe', 'inherit', 'inherit'],
      })
      if (result.status !== 0) {
        console.log(`Hook failed: ${name}`)
        failed.push(name)
      }
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }

  if (failed.length > 0) {
    console.log('')
    console.log('Hook errors:')
    for (const h of failed) console.log(`  - ${h}`)
  }
  return { event, failed }
}

export { VALID_EVENTS }
