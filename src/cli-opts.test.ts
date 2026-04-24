import { describe, it, expect } from 'vitest'
import { pickScope, pickScopeFilter, parseTicketsMode, parseHookEvent } from './cli-opts.js'

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

describe('parseTicketsMode', () => {
  it('resolves canonical modes and aliases', () => {
    expect(parseTicketsMode('pending')).toEqual({ ok: true, value: 'pending' })
    expect(parseTicketsMode('p')).toEqual({ ok: true, value: 'pending' })
    expect(parseTicketsMode('done')).toEqual({ ok: true, value: 'done' })
    expect(parseTicketsMode('d')).toEqual({ ok: true, value: 'done' })
    expect(parseTicketsMode('failed')).toEqual({ ok: true, value: 'failed' })
    expect(parseTicketsMode('f')).toEqual({ ok: true, value: 'failed' })
    expect(parseTicketsMode('draft')).toEqual({ ok: true, value: 'draft' })
    expect(parseTicketsMode('dr')).toEqual({ ok: true, value: 'draft' })
    expect(parseTicketsMode('all')).toEqual({ ok: true, value: 'all' })
    expect(parseTicketsMode('a')).toEqual({ ok: true, value: 'all' })
  })

  it('defaults to pending when input is undefined', () => {
    expect(parseTicketsMode(undefined)).toEqual({ ok: true, value: 'pending' })
  })

  it('is case-insensitive', () => {
    expect(parseTicketsMode('DONE')).toEqual({ ok: true, value: 'done' })
  })

  it('returns err on unknown mode', () => {
    const r = parseTicketsMode('bogus')
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toMatch(/Unknown tickets mode: bogus/)
      expect(r.exitCode).toBe(1)
    }
  })
})

describe('parseHookEvent', () => {
  it('accepts every valid event', () => {
    for (const ev of ['on-start', 'on-complete', 'on-error']) {
      expect(parseHookEvent(ev)).toEqual({ ok: true, value: ev })
    }
  })

  it('returns err with the full valid list on unknown input', () => {
    const r = parseHookEvent('on-bogus')
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toMatch(/Invalid event 'on-bogus'/)
      expect(r.error).toMatch(/on-start, on-complete, on-error/)
      expect(r.exitCode).toBe(1)
    }
  })
})
