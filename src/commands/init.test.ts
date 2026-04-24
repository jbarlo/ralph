import { describe, it, expect, afterEach } from 'vitest'
import { chmodSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { initProject } from './init.js'
import { tempDir } from '../test-helpers.js'

describe('initProject', () => {
  let cleanupFns: (() => void)[] = []
  afterEach(() => {
    cleanupFns.forEach(fn => fn())
    cleanupFns = []
  })

  it('creates .ralph/ structure', () => {
    const { path, cleanup } = tempDir()
    cleanupFns.push(cleanup)

    const r = initProject(path)
    expect(r.ok).toBe(true)

    expect(existsSync(join(path, '.ralph'))).toBe(true)
    expect(existsSync(join(path, '.ralph/tickets.json'))).toBe(true)
    expect(existsSync(join(path, '.ralph/progress.txt'))).toBe(true)
    expect(existsSync(join(path, '.ralph/hooks.d/on-start'))).toBe(true)
    expect(existsSync(join(path, '.ralph/hooks.d/on-complete'))).toBe(true)
    expect(existsSync(join(path, '.ralph/hooks.d/on-error'))).toBe(true)
    expect(existsSync(join(path, 'flake.nix'))).toBe(true)
    expect(existsSync(join(path, 'CLAUDE.md'))).toBe(false)
  })

  it('returns err when the target directory is unwritable', () => {
    const { path, cleanup } = tempDir()
    cleanupFns.push(cleanup)
    chmodSync(path, 0o500)
    cleanupFns.unshift(() => chmodSync(path, 0o700))

    const r = initProject(path)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toMatch(/Failed to (create|write)/)
      expect(r.exitCode).toBe(1)
    }
  })
})
