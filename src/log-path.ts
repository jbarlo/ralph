export function buildLogFilename(opts: {
  iteration?: number
  ticketId?: number
}): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const parts = [ts]
  if (opts.iteration != null) parts.push(`iter${opts.iteration}`)
  if (opts.ticketId != null) parts.push(`ticket${opts.ticketId}`)
  parts.push('log')
  return parts.join('.') // e.g. 2026-05-02T10-00-00-000Z.iter1.ticket3.log
}
