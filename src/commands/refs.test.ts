import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { list, listNames, show, refPath, shadowed, resolveRef, pickScope, pickScopeFilter } from './refs.js'
import { tempDir } from '../test-helpers.js'

describe('refs', () => {
  const cleanupFns: (() => void)[] = []
  let projectDir: string
  let globalHome: string

  beforeEach(() => {
    const p = tempDir()
    const g = tempDir()
    projectDir = p.path
    globalHome = g.path
    cleanupFns.push(p.cleanup, g.cleanup)
    process.env.RALPH_GLOBAL_DIR = globalHome
    mkdirSync(join(projectDir, '.ralph/refs'), { recursive: true })
    mkdirSync(join(globalHome, 'refs'), { recursive: true })
  })

  afterEach(() => {
    cleanupFns.forEach(fn => fn())
    cleanupFns.length = 0
    delete process.env.RALPH_GLOBAL_DIR
  })

  const writeProj = (name: string, body: string) => {
    const full = join(projectDir, '.ralph/refs', `${name}.md`)
    mkdirSync(join(full, '..'), { recursive: true })
    writeFileSync(full, body)
  }
  const writeGlobal = (name: string, body: string) => {
    const full = join(globalHome, 'refs', `${name}.md`)
    mkdirSync(join(full, '..'), { recursive: true })
    writeFileSync(full, body)
  }

  it('list merges with project precedence', () => {
    writeGlobal('alpha', 'G:alpha')
    writeGlobal('beta', 'G:beta')
    writeProj('beta', 'P:beta')
    writeProj('gamma', 'P:gamma')

    const out = list(undefined, projectDir)
    expect(out).toBe(
      'alpha\t[global]\n' +
      'beta\t[project]\n' +
      'gamma\t[project]',
    )
  })

  it('list --project and --global filter scopes', () => {
    writeGlobal('alpha', 'G')
    writeProj('beta', 'P')
    expect(list('project', projectDir)).toBe('beta')
    expect(list('global', projectDir)).toBe('alpha')
  })

  it('list --all marks shadowed entries', () => {
    writeGlobal('same', 'G')
    writeProj('same', 'P')
    writeGlobal('only-g', 'G')
    writeProj('only-p', 'P')
    const out = list('all', projectDir)
    expect(out).toBe(
      'only-g\t[global]\n' +
      'only-p\t[project]\n' +
      'same\t[project] (shadows global)',
    )
  })

  it('show returns project copy when both exist (precedence)', () => {
    writeGlobal('x', 'global body')
    writeProj('x', 'project body')
    expect(show('x', undefined, projectDir)).toBe('project body')
  })

  it('show --global forces global scope', () => {
    writeGlobal('x', 'global body')
    writeProj('x', 'project body')
    expect(show('x', 'global', projectDir)).toBe('global body')
  })

  it('show --project errors if missing in project', () => {
    writeGlobal('x', 'global body')
    expect(() => show('x', 'project', projectDir)).toThrow(/not found in project scope/)
  })

  it('show strips single trailing newline', () => {
    writeProj('x', 'body\n')
    expect(show('x', undefined, projectDir)).toBe('body')
  })

  it('path returns absolute path of resolved ref', () => {
    writeProj('x', 'body')
    expect(refPath('x', undefined, projectDir)).toBe(join(projectDir, '.ralph/refs/x.md'))
  })

  it('nested dirs use posix-style path as name', () => {
    writeProj('patterns/result-type', 'body')
    expect(show('patterns/result-type', undefined, projectDir)).toBe('body')
    expect(list('project', projectDir)).toBe('patterns/result-type')
  })

  it('shadowed lists project refs that shadow a same-name global', () => {
    writeGlobal('a', 'G')
    writeGlobal('b', 'G')
    writeProj('a', 'P')
    writeProj('c', 'P')
    expect(shadowed(projectDir)).toBe('a')
  })

  it('resolveRef throws when ref missing entirely', () => {
    expect(() => resolveRef('nope', undefined, projectDir)).toThrow(/not found/)
  })

  it('path --global and --project force scope', () => {
    writeGlobal('x', 'G')
    writeProj('x', 'P')
    expect(refPath('x', 'global', projectDir)).toBe(join(globalHome, 'refs/x.md'))
    expect(refPath('x', 'project', projectDir)).toBe(join(projectDir, '.ralph/refs/x.md'))
  })

  it('path --project errors if missing in project', () => {
    writeGlobal('x', 'G')
    expect(() => refPath('x', 'project', projectDir)).toThrow(/not found in project scope/)
  })

  it('pickScope rejects --global + --project together', () => {
    expect(() => pickScope({ global: true, project: true })).toThrow(/mutually exclusive/)
    expect(pickScope({ global: true })).toBe('global')
    expect(pickScope({ project: true })).toBe('project')
    expect(pickScope({})).toBeUndefined()
  })

  it('pickScopeFilter rejects any two scope flags together', () => {
    expect(() => pickScopeFilter({ global: true, project: true })).toThrow(/mutually exclusive/)
    expect(() => pickScopeFilter({ global: true, all: true })).toThrow(/mutually exclusive/)
    expect(() => pickScopeFilter({ project: true, all: true })).toThrow(/mutually exclusive/)
    expect(pickScopeFilter({ all: true })).toBe('all')
    expect(pickScopeFilter({ global: true })).toBe('global')
    expect(pickScopeFilter({ project: true })).toBe('project')
    expect(pickScopeFilter({})).toBeUndefined()
  })

  it('listNames dedupes across scopes for completions', () => {
    writeGlobal('alpha', 'G')
    writeGlobal('beta', 'G')
    writeProj('beta', 'P')
    writeProj('gamma', 'P')
    expect(listNames(projectDir)).toBe('alpha\nbeta\ngamma')
  })
})
