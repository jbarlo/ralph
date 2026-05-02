import { describe, it, expect, vi, afterEach } from 'vitest'
import { buildLogFilename } from './log-path.js'

describe('buildLogFilename', () => {
  afterEach(() => vi.useRealTimers())

  it('includes iteration and ticket id for loop mode', () => {
    vi.useFakeTimers({ now: new Date('2026-05-02T14:30:00.000Z') })
    const name = buildLogFilename({ iteration: 3, ticketId: 7 })
    expect(name).toBe('2026-05-02T14-30-00-000Z.iter3.ticket7.log')
  })

  it('omits iteration for once mode', () => {
    vi.useFakeTimers({ now: new Date('2026-05-02T14:30:00.000Z') })
    const name = buildLogFilename({ ticketId: 7 })
    expect(name).toBe('2026-05-02T14-30-00-000Z.ticket7.log')
  })

  it('handles missing ticket id', () => {
    vi.useFakeTimers({ now: new Date('2026-05-02T14:30:00.000Z') })
    const name = buildLogFilename({ iteration: 1 })
    expect(name).toBe('2026-05-02T14-30-00-000Z.iter1.log')
  })
})
