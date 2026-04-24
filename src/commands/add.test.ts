import { describe, it, expect, afterEach } from 'vitest'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { addTicket } from './add.js'
import { tempDir } from '../test-helpers.js'

describe('addTicket', () => {
  let cleanupFns: (() => void)[] = []
  afterEach(() => {
    cleanupFns.forEach(fn => fn())
    cleanupFns = []
  })

  it('appends a ticket to .ralph/tickets.json', () => {
    const { path, cleanup } = tempDir()
    cleanupFns.push(cleanup)
    mkdirSync(join(path, '.ralph'))
    writeFileSync(join(path, '.ralph/tickets.json'), '{"tickets":[]}')

    const r = addTicket('Test ticket', 5, 'Test description', path)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toMatch(/Added #1/)

    const file = JSON.parse(readFileSync(join(path, '.ralph/tickets.json'), 'utf8'))
    expect(file.tickets).toHaveLength(1)
    expect(file.tickets[0].title).toBe('Test ticket')
    expect(file.tickets[0].priority).toBe(5)
    expect(file.tickets[0].description).toBe('Test description')
    expect(file.tickets[0].status).toBe('pending')
    expect(file.tickets[0].id).toBe(1)
  })
})
