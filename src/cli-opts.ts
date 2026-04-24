import type { Scope, ScopeFilter } from './commands/refs.js'
import { ok, err, type Result } from './lib/result.js'

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
