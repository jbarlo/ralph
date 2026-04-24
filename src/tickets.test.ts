import { describe, it, expect, afterEach } from 'vitest'
import { writeFileSync, chmodSync } from 'node:fs'
import { join } from 'node:path'
import { readTickets, writeTickets, nextId, pickNext, remaining } from './tickets.js'
import { tempDir } from './test-helpers.js'

describe('readTickets', () => {
  const cleanups: (() => void)[] = []
  afterEach(() => {
    cleanups.forEach(fn => fn())
    cleanups.length = 0
  })

  it('returns an empty file when the path does not exist', () => {
    const { path, cleanup } = tempDir()
    cleanups.push(cleanup)
    const r = readTickets(join(path, 'missing.json'))
    expect(r).toEqual({ ok: true, value: { tickets: [] } })
  })

  it('parses a valid tickets file', () => {
    const { path, cleanup } = tempDir()
    cleanups.push(cleanup)
    const file = join(path, 'tickets.json')
    writeFileSync(file, JSON.stringify({
      tickets: [{ id: 1, title: 'a', description: '', status: 'pending', priority: 5 }],
    }))
    const r = readTickets(file)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.tickets[0]?.title).toBe('a')
  })

  it('returns err on malformed JSON', () => {
    const { path, cleanup } = tempDir()
    cleanups.push(cleanup)
    const file = join(path, 'tickets.json')
    writeFileSync(file, '{not valid json')
    const r = readTickets(file)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toMatch(/Failed to parse/)
      expect(r.exitCode).toBe(1)
    }
  })
})

describe('writeTickets', () => {
  const cleanups: (() => void)[] = []
  afterEach(() => {
    cleanups.forEach(fn => fn())
    cleanups.length = 0
  })

  it('writes a tickets file and round-trips', () => {
    const { path, cleanup } = tempDir()
    cleanups.push(cleanup)
    const file = join(path, 'tickets.json')
    const data = { tickets: [{ id: 1, title: 't', description: '', status: 'pending' as const, priority: 1 }] }
    const w = writeTickets(file, data)
    expect(w.ok).toBe(true)
    const r = readTickets(file)
    expect(r).toEqual({ ok: true, value: data })
  })

  it('returns err when the target directory is unwritable', () => {
    const { path, cleanup } = tempDir()
    cleanups.push(cleanup)
    chmodSync(path, 0o500)
    cleanups.unshift(() => chmodSync(path, 0o700))
    const r = writeTickets(join(path, 'tickets.json'), { tickets: [] })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/Failed to write/)
  })
})

describe('pure helpers', () => {
  it('nextId returns 1 for an empty file', () => {
    expect(nextId({ tickets: [] })).toBe(1)
  })

  it('nextId returns max+1', () => {
    const file = { tickets: [
      { id: 2, title: '', description: '', status: 'pending' as const, priority: 1 },
      { id: 5, title: '', description: '', status: 'completed' as const, priority: 1 },
    ] }
    expect(nextId(file)).toBe(6)
  })

  it('pickNext returns the lowest-priority active ticket', () => {
    const file = { tickets: [
      { id: 1, title: '', description: '', status: 'pending' as const, priority: 5 },
      { id: 2, title: '', description: '', status: 'pending' as const, priority: 2 },
      { id: 3, title: '', description: '', status: 'completed' as const, priority: 1 },
    ] }
    expect(pickNext(file)?.id).toBe(2)
  })

  it('pickNext returns undefined when nothing is active', () => {
    const file = { tickets: [
      { id: 1, title: '', description: '', status: 'completed' as const, priority: 1 },
    ] }
    expect(pickNext(file)).toBeUndefined()
  })

  it('remaining counts pending and in_progress', () => {
    const file = { tickets: [
      { id: 1, title: '', description: '', status: 'pending' as const, priority: 1 },
      { id: 2, title: '', description: '', status: 'in_progress' as const, priority: 1 },
      { id: 3, title: '', description: '', status: 'completed' as const, priority: 1 },
      { id: 4, title: '', description: '', status: 'draft' as const, priority: 1 },
    ] }
    expect(remaining(file)).toBe(2)
  })
})
