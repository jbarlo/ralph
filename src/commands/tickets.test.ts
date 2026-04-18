import { describe, it, expect, afterEach } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { listTickets } from './tickets.js'
import { tempDir } from '../test-helpers.js'

describe('listTickets', () => {
  let cleanupFns: (() => void)[] = []
  afterEach(() => {
    cleanupFns.forEach(fn => fn())
    cleanupFns = []
  })

  it('reads tickets from .ralph/tickets.json', () => {
    const { path, cleanup } = tempDir()
    cleanupFns.push(cleanup)
    mkdirSync(join(path, '.ralph'))
    writeFileSync(
      join(path, '.ralph/tickets.json'),
      JSON.stringify({
        tickets: [{ id: 1, title: 'Test', status: 'pending', priority: 1, description: '' }],
      }),
    )

    const out = listTickets('pending', false, path)
    expect(out).toContain('Test')
  })
})
