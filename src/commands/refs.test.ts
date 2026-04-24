import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { makeRefsCommands, type RefsCommands } from './refs.js'
import { tempDir } from '../test-helpers.js'

describe('refs commands', () => {
  const cleanupFns: (() => void)[] = []
  let projectDir: string
  let globalHome: string
  let refs: RefsCommands

  beforeEach(() => {
    const p = tempDir()
    const g = tempDir()
    projectDir = p.path
    globalHome = g.path
    cleanupFns.push(p.cleanup, g.cleanup)
    process.env.RALPH_GLOBAL_DIR = globalHome
    mkdirSync(join(projectDir, '.ralph/refs'), { recursive: true })
    mkdirSync(join(globalHome, 'refs'), { recursive: true })
    refs = makeRefsCommands(projectDir)
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

  const value = <T>(r: { ok: boolean; value?: T; error?: string }): T => {
    if (!r.ok) throw new Error(`expected ok, got err: ${r.error}`)
    return r.value as T
  }

  // list

  it('list merges with project precedence', () => {
    writeGlobal('alpha', 'G')
    writeGlobal('beta', 'G')
    writeProj('beta', 'P')
    writeProj('gamma', 'P')
    expect(value(refs.list(undefined))).toBe(
      'alpha\t[global]\n' +
      'beta\t[project]\n' +
      'gamma\t[project]',
    )
  })

  it('list filters by scope', () => {
    writeGlobal('alpha', 'G')
    writeProj('beta', 'P')
    expect(value(refs.list('project'))).toBe('beta')
    expect(value(refs.list('global'))).toBe('alpha')
  })

  it('list all marks shadowed entries', () => {
    writeGlobal('same', 'G')
    writeProj('same', 'P')
    writeGlobal('only-g', 'G')
    writeProj('only-p', 'P')
    expect(value(refs.list('all'))).toBe(
      'only-g\t[global]\n' +
      'only-p\t[project]\n' +
      'same\t[project] (shadows global)',
    )
  })

  it('listNames dedupes across scopes', () => {
    writeGlobal('alpha', 'G')
    writeGlobal('beta', 'G')
    writeProj('beta', 'P')
    writeProj('gamma', 'P')
    expect(value(refs.listNames())).toBe('alpha\nbeta\ngamma')
  })

  // show

  it('show returns project copy when both exist (precedence)', () => {
    writeGlobal('x', 'global body')
    writeProj('x', 'project body')
    expect(value(refs.show('x'))).toBe('project body')
  })

  it('show with scope forces that scope', () => {
    writeGlobal('x', 'global body')
    writeProj('x', 'project body')
    expect(value(refs.show('x', 'global'))).toBe('global body')
  })

  it('show returns err when missing in forced scope', () => {
    writeGlobal('x', 'G')
    const r = refs.show('x', 'project')
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toMatch(/not found in project scope/)
      expect(r.exitCode).toBe(1)
    }
  })

  it('show returns err when missing in both scopes', () => {
    const r = refs.show('nope')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/not found/)
  })

  it('show strips a single trailing newline', () => {
    writeProj('x', 'body\n')
    expect(value(refs.show('x'))).toBe('body')
  })

  // path

  it('path returns the resolved absolute path', () => {
    writeProj('x', 'body')
    expect(value(refs.path('x'))).toBe(join(projectDir, '.ralph/refs/x.md'))
  })

  it('path with scope forces that scope', () => {
    writeGlobal('x', 'G')
    writeProj('x', 'P')
    expect(value(refs.path('x', 'global'))).toBe(join(globalHome, 'refs/x.md'))
    expect(value(refs.path('x', 'project'))).toBe(join(projectDir, '.ralph/refs/x.md'))
  })

  it('path returns err when missing in both scopes', () => {
    const r = refs.path('nope')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/not found/)
  })

  // shadowed

  it('shadowed lists project refs that shadow a same-name global', () => {
    writeGlobal('a', 'G')
    writeGlobal('b', 'G')
    writeProj('a', 'P')
    writeProj('c', 'P')
    expect(value(refs.shadowed())).toBe('a')
  })

  // dir

  it('dir prints both scopes by default, even when empty', () => {
    expect(value(refs.dir())).toBe(
      `project\t${join(projectDir, '.ralph/refs')}\n` +
      `global\t${join(globalHome, 'refs')}`,
    )
  })

  it('dir with scope returns a single path', () => {
    expect(value(refs.dir('global'))).toBe(join(globalHome, 'refs'))
    expect(value(refs.dir('project'))).toBe(join(projectDir, '.ralph/refs'))
  })

  // empty state

  it('returns empty string when no refs exist in either scope', () => {
    expect(value(refs.list(undefined))).toBe('')
    expect(value(refs.list('project'))).toBe('')
    expect(value(refs.list('global'))).toBe('')
    expect(value(refs.list('all'))).toBe('')
    expect(value(refs.listNames())).toBe('')
    expect(value(refs.shadowed())).toBe('')
  })

  // nested

  it('nested dirs use posix-style path as name', () => {
    writeProj('patterns/result-type', 'body')
    expect(value(refs.show('patterns/result-type'))).toBe('body')
    expect(value(refs.list('project'))).toBe('patterns/result-type')
  })

  // tag filtering

  const withTags = (tags: string[], body: string) =>
    `---\ntags: [${tags.map(t => `"${t}"`).join(', ')}]\n---\n${body}`

  it('list with a single tag filters to matching refs', () => {
    writeGlobal('arch', withTags(['architecture'], 'a'))
    writeGlobal('logging', withTags(['philosophy'], 'l'))
    writeProj('dal', withTags(['architecture', 'persistence'], 'd'))
    const out = value(refs.list(undefined, { tags: ['architecture'], any: false }))
    expect(out).toBe('arch\t[global]\ndal\t[project]')
  })

  it('list with multiple tags defaults to AND (all must match)', () => {
    writeGlobal('a', withTags(['architecture'], ''))
    writeGlobal('b', withTags(['architecture', 'persistence'], ''))
    writeGlobal('c', withTags(['persistence'], ''))
    const out = value(refs.list('global', { tags: ['architecture', 'persistence'], any: false }))
    expect(out).toBe('b')
  })

  it('list with any=true switches to OR semantics', () => {
    writeGlobal('a', withTags(['architecture'], ''))
    writeGlobal('b', withTags(['persistence'], ''))
    writeGlobal('c', withTags(['unrelated'], ''))
    const out = value(refs.list('global', { tags: ['architecture', 'persistence'], any: true }))
    expect(out).toBe('a\nb')
  })

  it('list excludes refs without a tags frontmatter block when filter is active', () => {
    writeGlobal('tagged', withTags(['x'], ''))
    writeGlobal('untagged', 'body with no frontmatter')
    expect(value(refs.list('global', { tags: ['x'], any: false }))).toBe('tagged')
  })

  it('list ignores the filter when no tags are requested (default behavior preserved)', () => {
    writeGlobal('a', 'body')
    writeGlobal('b', withTags(['x'], ''))
    const out = value(refs.list('global', { tags: [], any: false }))
    expect(out).toBe('a\nb')
  })

  it('list tolerates malformed frontmatter (treats ref as untagged)', () => {
    writeGlobal('broken', '---\ntags: {oops\n---\nbody')
    writeGlobal('ok', withTags(['x'], ''))
    expect(value(refs.list('global', { tags: ['x'], any: false }))).toBe('ok')
  })

  it('listNames honors the tag filter (for completions)', () => {
    writeGlobal('a', withTags(['x'], ''))
    writeProj('b', withTags(['y'], ''))
    expect(value(refs.listNames({ tags: ['x'], any: false }))).toBe('a')
  })

  it('listTags returns the deduped union of tags across both scopes', () => {
    writeGlobal('a', withTags(['architecture', 'persistence'], ''))
    writeProj('b', withTags(['persistence', 'philosophy'], ''))
    expect(value(refs.listTags())).toBe('architecture\npersistence\nphilosophy')
  })

  it('listTags returns empty when no refs have tags', () => {
    writeGlobal('a', 'body')
    writeProj('b', 'body')
    expect(value(refs.listTags())).toBe('')
  })
})
