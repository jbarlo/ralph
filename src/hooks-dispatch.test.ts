import { describe, it, expect, afterEach } from 'vitest'
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { dispatchEvent } from './hooks-dispatch.js'
import { tempDir } from './test-helpers.js'

describe('dispatchEvent', () => {
  let cleanupFns: (() => void)[] = []
  afterEach(() => {
    cleanupFns.forEach(fn => fn())
    cleanupFns = []
  })

  it('exposes payload via stdin, RALPH_HOOK_EVENT, and RALPH_HOOK_CONTEXT_FILE; cleans up the context file after', () => {
    const { path, cleanup } = tempDir()
    cleanupFns.push(cleanup)

    const hooksDir = join(path, '.ralph/hooks.d/on-complete')
    mkdirSync(hooksDir, { recursive: true })
    const outputFile = join(path, 'probe-output')
    const hookScript = join(hooksDir, '01-probe.sh')
    writeFileSync(
      hookScript,
      `#!/bin/sh
set -e
stdin=$(cat)
{
  echo "EVENT=$RALPH_HOOK_EVENT"
  echo "CONTEXT_FILE=$RALPH_HOOK_CONTEXT_FILE"
  echo "STDIN=$stdin"
  echo "FILE=$(cat "$RALPH_HOOK_CONTEXT_FILE")"
} > "${outputFile}"
`,
    )
    chmodSync(hookScript, 0o755)

    const payload = { event: 'complete', ticket: { id: 42, title: 'probe' } }
    const result = dispatchEvent('on-complete', payload, path)

    expect(result.failed).toEqual([])
    const lines = readFileSync(outputFile, 'utf8').trimEnd().split('\n')
    const fields = Object.fromEntries(lines.map(l => l.split(/=(.+)/).slice(0, 2))) as Record<string, string>

    expect(fields.EVENT).toBe('on-complete')
    expect(fields.CONTEXT_FILE).toMatch(/ralph-hook-[^/]+\/payload\.json$/)
    expect(JSON.parse(fields.STDIN)).toEqual(payload)
    expect(JSON.parse(fields.FILE)).toEqual(payload)

    expect(existsSync(fields.CONTEXT_FILE)).toBe(false)
  })

  it('reports failed hooks without halting subsequent ones', () => {
    const { path, cleanup } = tempDir()
    cleanupFns.push(cleanup)
    const hooksDir = join(path, '.ralph/hooks.d/on-error')
    mkdirSync(hooksDir, { recursive: true })

    const marker = join(path, 'second-ran')
    const failScript = join(hooksDir, '01-fail.sh')
    const passScript = join(hooksDir, '02-pass.sh')
    writeFileSync(failScript, '#!/bin/sh\nexit 7\n')
    writeFileSync(passScript, `#!/bin/sh\ntouch "${marker}"\n`)
    chmodSync(failScript, 0o755)
    chmodSync(passScript, 0o755)

    const result = dispatchEvent('on-error', { event: 'error' }, path)

    expect(result.failed).toEqual(['01-fail.sh'])
    expect(existsSync(marker)).toBe(true)
  })
})
