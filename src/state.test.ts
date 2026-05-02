import { describe, it, expect } from 'vitest'
import { join } from 'node:path'
import { resolveState } from './state.js'

describe('resolveState', () => {
  it('returns .ralph/ paths', () => {
    const state = resolveState('/tmp/fake')
    expect(state.tickets).toBe(join('/tmp/fake', '.ralph/tickets.json'))
    expect(state.progress).toBe(join('/tmp/fake', '.ralph/progress.txt'))
    expect(state.hooksDir).toBe(join('/tmp/fake', '.ralph/hooks.d'))
    expect(state.logsDir).toBe(join('/tmp/fake', '.ralph/logs'))
  })
})
