import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { chmodSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { makeHooksCommands, type HooksCommands } from './hooks.js'
import { tempDir } from '../test-helpers.js'

describe('hooks commands', () => {
  const cleanupFns: (() => void)[] = []
  let projectDir: string
  let scriptsDir: string
  let hooks: HooksCommands

  beforeEach(() => {
    const p = tempDir()
    const s = tempDir()
    projectDir = p.path
    scriptsDir = s.path
    cleanupFns.push(p.cleanup, s.cleanup)
    for (const ev of ['on-start', 'on-complete', 'on-error']) {
      mkdirSync(join(projectDir, '.ralph/hooks.d', ev), { recursive: true })
    }
    hooks = makeHooksCommands(projectDir)
  })

  afterEach(() => {
    cleanupFns.forEach(fn => fn())
    cleanupFns.length = 0
  })

  const writeScript = (name: string): string => {
    const path = join(scriptsDir, name)
    writeFileSync(path, '#!/bin/sh\n')
    chmodSync(path, 0o755)
    return path
  }

  // list

  it('list all returns sections for every event', () => {
    const r = hooks.list()
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value).toContain('on-start:')
      expect(r.value).toContain('on-complete:')
      expect(r.value).toContain('on-error:')
      expect(r.value).toContain('(no hooks)')
    }
  })

  it('list single event returns just that section', () => {
    const r = hooks.list('on-start')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value).toMatch(/^on-start:/)
      expect(r.value).not.toContain('on-complete')
    }
  })

  it('list shows the directory-not-found state when hooks.d/<event> is missing', () => {
    const fresh = tempDir()
    cleanupFns.push(fresh.cleanup)
    const r = makeHooksCommands(fresh.path).list('on-start')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toContain('(directory not found)')
  })

  // add

  it('add symlinks a script into hooks.d/<event>/ and marks it enabled', () => {
    const script = writeScript('my-hook.sh')
    const r = hooks.add('on-start', script)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toMatch(/Added hook: my-hook\.sh -> on-start/)

    expect(existsSync(join(projectDir, '.ralph/hooks.d/on-start/my-hook.sh'))).toBe(true)

    const listed = hooks.list('on-start')
    if (listed.ok) expect(listed.value).toContain('my-hook.sh [enabled]')
  })

  it('add returns err when the script path does not exist', () => {
    const r = hooks.add('on-start', join(scriptsDir, 'missing.sh'))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/not found/)
  })

  it('add returns err when the hooks.d/<event>/ directory is missing (no ralph init)', () => {
    const fresh = tempDir()
    cleanupFns.push(fresh.cleanup)
    const script = writeScript('a.sh')
    const r = makeHooksCommands(fresh.path).add('on-start', script)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/Run 'ralph init' first/)
  })

  it('add returns err when a hook of the same name already exists', () => {
    const script = writeScript('dup.sh')
    const first = hooks.add('on-start', script)
    expect(first.ok).toBe(true)
    const second = hooks.add('on-start', script)
    expect(second.ok).toBe(false)
    if (!second.ok) expect(second.error).toMatch(/already exists/)
  })

  // remove

  it('remove deletes the hook and lists the success message', () => {
    const script = writeScript('x.sh')
    hooks.add('on-start', script)
    const r = hooks.remove('on-start', 'x.sh')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toMatch(/Removed hook: x\.sh from on-start/)
    expect(existsSync(join(projectDir, '.ralph/hooks.d/on-start/x.sh'))).toBe(false)
  })

  it('remove returns err when the hook does not exist', () => {
    const r = hooks.remove('on-start', 'ghost.sh')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/not found in on-start/)
  })

  // listNames

  it('listNames dedupes across events (for completions)', () => {
    const script = writeScript('shared.sh')
    hooks.add('on-start', script)
    hooks.add('on-complete', script)
    const another = writeScript('solo.sh')
    hooks.add('on-error', another)

    const r = hooks.listNames()
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toBe('shared.sh\nsolo.sh')
  })
})
