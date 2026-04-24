import { describe, it, expect } from 'vitest'
import { pickScope, pickScopeFilter } from './cli-opts.js'

describe('pickScope', () => {
  it('returns the selected scope', () => {
    expect(pickScope({ global: true })).toEqual({ ok: true, value: 'global' })
    expect(pickScope({ project: true })).toEqual({ ok: true, value: 'project' })
  })

  it('returns undefined when no flag is set', () => {
    expect(pickScope({})).toEqual({ ok: true, value: undefined })
  })

  it('returns err when --global and --project are combined', () => {
    const r = pickScope({ global: true, project: true })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toMatch(/mutually exclusive/)
      expect(r.exitCode).toBe(1)
    }
  })
})

describe('pickScopeFilter', () => {
  it('returns the selected scope or filter', () => {
    expect(pickScopeFilter({ global: true })).toEqual({ ok: true, value: 'global' })
    expect(pickScopeFilter({ project: true })).toEqual({ ok: true, value: 'project' })
    expect(pickScopeFilter({ all: true })).toEqual({ ok: true, value: 'all' })
  })

  it('returns undefined when no flag is set', () => {
    expect(pickScopeFilter({})).toEqual({ ok: true, value: undefined })
  })

  it('returns err when any two scope flags are combined', () => {
    for (const opts of [
      { global: true, project: true },
      { global: true, all: true },
      { project: true, all: true },
    ]) {
      const r = pickScopeFilter(opts)
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error).toMatch(/mutually exclusive/)
    }
  })
})
