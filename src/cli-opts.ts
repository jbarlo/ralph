import type { Scope, ScopeFilter } from './commands/refs.js'
import type { TicketsMode } from './commands/tickets.js'
import { ok, err, type Result } from './lib/result.js'

const MODE_ALIAS: Record<string, TicketsMode> = {
  pending: 'pending', p: 'pending',
  done: 'done', d: 'done',
  failed: 'failed', f: 'failed',
  draft: 'draft', dr: 'draft',
  all: 'all', a: 'all',
}

export function parseTicketsMode(input: string | undefined): Result<TicketsMode, string> {
  const key = (input ?? 'pending').toLowerCase()
  const mode = MODE_ALIAS[key]
  if (!mode) return err(`Unknown tickets mode: ${input}`, 1)
  return ok(mode)
}

export function pickScope(opts: { global?: boolean; project?: boolean }): Result<Scope | undefined, string> {
  if (opts.global && opts.project) return err('--global and --project are mutually exclusive', 1)
  if (opts.global) return ok('global')
  if (opts.project) return ok('project')
  return ok(undefined)
}

export function pickScopeFilter(opts: { global?: boolean; project?: boolean; all?: boolean }): Result<ScopeFilter, string> {
  const flags = [opts.global, opts.project, opts.all].filter(Boolean).length
  if (flags > 1) return err('--global, --project, and --all are mutually exclusive', 1)
  if (opts.all) return ok('all')
  if (opts.global) return ok('global')
  if (opts.project) return ok('project')
  return ok(undefined)
}
