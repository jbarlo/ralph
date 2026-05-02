import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { resolveState, findRalphRoot, requireProject } from './state.js'

describe('resolveState', () => {
  it('returns .ralph/ paths', () => {
    const state = resolveState('/tmp/fake')
    expect(state.tickets).toBe(join('/tmp/fake', '.ralph/tickets.json'))
    expect(state.progress).toBe(join('/tmp/fake', '.ralph/progress.txt'))
    expect(state.hooksDir).toBe(join('/tmp/fake', '.ralph/hooks.d'))
    expect(state.logsDir).toBe(join('/tmp/fake', '.ralph/logs'))
  })

  it('includes root in returned paths', () => {
    const state = resolveState('/tmp/fake')
    expect(state.root).toBe('/tmp/fake')
  })
})

describe('findRalphRoot', () => {
  let tmp: string

  beforeEach(() => {
    tmp = mkdtempSync(join('/tmp', 'ralph-test-'))
  })

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true })
    delete process.env.RALPH_PROJECT_DIR
  })

  it('finds .ralph in cwd', () => {
    mkdirSync(join(tmp, '.ralph'))
    expect(findRalphRoot(tmp)).toBe(tmp)
  })

  it('finds .ralph in parent directory', () => {
    mkdirSync(join(tmp, '.ralph'))
    const sub = join(tmp, 'src', 'lib')
    mkdirSync(sub, { recursive: true })
    expect(findRalphRoot(sub)).toBe(tmp)
  })

  it('returns undefined when no .ralph found', () => {
    expect(findRalphRoot(tmp)).toBeUndefined()
  })

  it('honors RALPH_PROJECT_DIR override', () => {
    const override = join(tmp, 'custom')
    mkdirSync(override)
    process.env.RALPH_PROJECT_DIR = override
    expect(findRalphRoot('/some/other/path')).toBe(override)
  })

  it('picks closest .ralph in nested projects', () => {
    mkdirSync(join(tmp, '.ralph'))
    const inner = join(tmp, 'nested', 'project')
    mkdirSync(join(inner, '.ralph'), { recursive: true })
    expect(findRalphRoot(inner)).toBe(inner)
  })
})

describe('requireProject', () => {
  let tmp: string

  beforeEach(() => {
    tmp = mkdtempSync(join('/tmp', 'ralph-test-'))
    delete process.env.RALPH_PROJECT_DIR
  })

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true })
  })

  it('returns ok with state when .ralph exists', () => {
    mkdirSync(join(tmp, '.ralph'))
    const r = requireProject(tmp)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.root).toBe(tmp)
      expect(r.value.tickets).toBe(join(tmp, '.ralph/tickets.json'))
    }
  })

  it('returns error when no .ralph found', () => {
    const r = requireProject(tmp)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toContain('not in a ralph project')
      expect(r.exitCode).toBe(1)
    }
  })

  it('walks up to find .ralph in parent', () => {
    mkdirSync(join(tmp, '.ralph'))
    const sub = join(tmp, 'deep', 'subdir')
    mkdirSync(sub, { recursive: true })
    const r = requireProject(sub)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.root).toBe(tmp)
    }
  })
})
