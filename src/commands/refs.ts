import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { globalRefsDir, projectRefsDir } from '../refs-dir.js'

export type Scope = 'global' | 'project'
export type ScopeFilter = Scope | 'all' | undefined

export function pickScope(opts: { global?: boolean; project?: boolean }): Scope | undefined {
  if (opts.global && opts.project) {
    throw new Error('--global and --project are mutually exclusive')
  }
  if (opts.global) return 'global'
  if (opts.project) return 'project'
  return undefined
}

export function pickScopeFilter(opts: { global?: boolean; project?: boolean; all?: boolean }): ScopeFilter {
  const flags = [opts.global, opts.project, opts.all].filter(Boolean).length
  if (flags > 1) throw new Error('--global, --project, and --all are mutually exclusive')
  if (opts.all) return 'all'
  if (opts.global) return 'global'
  if (opts.project) return 'project'
  return undefined
}

function scopeDir(scope: Scope, cwd: string): string {
  return scope === 'global' ? globalRefsDir() : projectRefsDir(cwd)
}

function toPosix(p: string): string {
  return sep === '/' ? p : p.split(sep).join('/')
}

function walk(dir: string): string[] {
  if (!existsSync(dir)) return []
  const out: string[] = []
  const stack: string[] = [dir]
  while (stack.length) {
    const d = stack.pop()!
    for (const entry of readdirSync(d)) {
      const full = join(d, entry)
      const st = statSync(full)
      if (st.isDirectory()) stack.push(full)
      else if (st.isFile() && entry.endsWith('.md')) out.push(full)
    }
  }
  return out
}

function refsInDir(dir: string): Map<string, string> {
  const result = new Map<string, string>()
  for (const file of walk(dir)) {
    const rel = toPosix(relative(dir, file)).replace(/\.md$/, '')
    result.set(rel, file)
  }
  return result
}

export function list(filter: ScopeFilter, cwd: string = process.cwd()): string {
  const proj = refsInDir(projectRefsDir(cwd))
  const glob = refsInDir(globalRefsDir())

  if (filter === 'project') return formatNames(proj)
  if (filter === 'global') return formatNames(glob)
  if (filter === 'all') return formatAll(proj, glob)

  const merged = new Map<string, Scope>()
  for (const n of glob.keys()) merged.set(n, 'global')
  for (const n of proj.keys()) merged.set(n, 'project')
  const lines = [...merged.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, scope]) => `${name}\t[${scope}]`)
  return lines.join('\n')
}

function formatNames(refs: Map<string, string>): string {
  return [...refs.keys()].sort().join('\n')
}

function formatAll(proj: Map<string, string>, glob: Map<string, string>): string {
  const names = new Set([...proj.keys(), ...glob.keys()])
  const lines = [...names].sort().map(name => {
    const inP = proj.has(name)
    const inG = glob.has(name)
    if (inP && inG) return `${name}\t[project] (shadows global)`
    if (inP) return `${name}\t[project]`
    return `${name}\t[global]`
  })
  return lines.join('\n')
}

export function listNames(cwd: string = process.cwd()): string {
  const names = new Set<string>()
  for (const n of refsInDir(projectRefsDir(cwd)).keys()) names.add(n)
  for (const n of refsInDir(globalRefsDir()).keys()) names.add(n)
  return [...names].sort().join('\n')
}

export function resolveRef(name: string, scope: Scope | undefined, cwd: string = process.cwd()): { path: string; scope: Scope } {
  if (scope) {
    const path = join(scopeDir(scope, cwd), `${name}.md`)
    if (!existsSync(path)) throw new Error(`Ref '${name}' not found in ${scope} scope`)
    return { path, scope }
  }
  const projPath = join(projectRefsDir(cwd), `${name}.md`)
  if (existsSync(projPath)) return { path: projPath, scope: 'project' }
  const globPath = join(globalRefsDir(), `${name}.md`)
  if (existsSync(globPath)) return { path: globPath, scope: 'global' }
  throw new Error(`Ref '${name}' not found`)
}

export function show(name: string, scope: Scope | undefined, cwd: string = process.cwd()): string {
  const { path } = resolveRef(name, scope, cwd)
  return readFileSync(path, 'utf8').replace(/\n$/, '')
}

export function refPath(name: string, scope: Scope | undefined, cwd: string = process.cwd()): string {
  return resolveRef(name, scope, cwd).path
}

export function shadowed(cwd: string = process.cwd()): string {
  const proj = refsInDir(projectRefsDir(cwd))
  const glob = refsInDir(globalRefsDir())
  const names = [...proj.keys()].filter(n => glob.has(n)).sort()
  return names.join('\n')
}
