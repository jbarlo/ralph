import { describe, it, expect, afterEach } from 'vitest'
import { existsSync } from 'node:fs'
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

    initProject(path)

    expect(existsSync(join(path, '.ralph'))).toBe(true)
    expect(existsSync(join(path, '.ralph/tickets.json'))).toBe(true)
    expect(existsSync(join(path, '.ralph/progress.txt'))).toBe(true)
    expect(existsSync(join(path, '.ralph/hooks.d/on-start'))).toBe(true)
    expect(existsSync(join(path, '.ralph/hooks.d/on-complete'))).toBe(true)
    expect(existsSync(join(path, '.ralph/hooks.d/on-error'))).toBe(true)
    expect(existsSync(join(path, '.ralph/orchestrator.md'))).toBe(true)
    expect(existsSync(join(path, 'RALPH.md'))).toBe(true)
    expect(existsSync(join(path, 'flake.nix'))).toBe(true)
    expect(existsSync(join(path, 'CLAUDE.md'))).toBe(false)
  })
})
