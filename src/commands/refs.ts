import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { parse as yamlParse } from 'yaml'
import { globalRefsDir, projectRefsDir } from '../refs-dir.js'
import { ok, err, type Result } from '../lib/result.js'

export type Scope = 'global' | 'project'
export type ScopeFilter = Scope | 'all' | undefined

export type TagFilter = { tags: string[]; any: boolean }

const NO_FILTER: TagFilter = { tags: [], any: false }

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

function parseFrontmatter(content: string): { tags: string[] } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)
  if (!match) return { tags: [] }
  try {
    const parsed = yamlParse(match[1]) as { tags?: unknown } | null | undefined
    const raw = parsed?.tags
    const tags = Array.isArray(raw) ? raw.filter((t): t is string => typeof t === 'string') : []
    return { tags }
  } catch {
    return { tags: [] }
  }
}

function refTags(filepath: string): string[] {
  try {
    return parseFrontmatter(readFileSync(filepath, 'utf8')).tags
  } catch {
    return []
  }
}

function filterByTags(refs: Map<string, string>, filter: TagFilter): Map<string, string> {
  if (filter.tags.length === 0) return refs
  const out = new Map<string, string>()
  for (const [name, file] of refs) {
    const tags = new Set(refTags(file))
    const matches = filter.any
      ? filter.tags.some(t => tags.has(t))
      : filter.tags.every(t => tags.has(t))
    if (matches) out.set(name, file)
  }
  return out
}

function resolveRef(name: string, scope: Scope | undefined, cwd: string): Result<string, string> {
  if (scope) {
    const path = join(scopeDir(scope, cwd), `${name}.md`)
    if (!existsSync(path)) return err(`Ref '${name}' not found in ${scope} scope`, 1)
    return ok(path)
  }
  const projPath = join(projectRefsDir(cwd), `${name}.md`)
  if (existsSync(projPath)) return ok(projPath)
  const globPath = join(globalRefsDir(), `${name}.md`)
  if (existsSync(globPath)) return ok(globPath)
  return err(`Ref '${name}' not found`, 1)
}

function readRefFile(path: string): Result<string, string> {
  try {
    return ok(readFileSync(path, 'utf8').replace(/\n$/, ''))
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return err(message, 1)
  }
}

export type RefsCommands = {
  list(filter: ScopeFilter, tags?: TagFilter): Result<string, string>
  listNames(tags?: TagFilter): Result<string, string>
  listTags(): Result<string, string>
  show(name: string, scope?: Scope): Result<string, string>
  path(name: string, scope?: Scope): Result<string, string>
  shadowed(): Result<string, string>
  dir(scope?: Scope): Result<string, string>
}

export function makeRefsCommands(cwd: string = process.cwd()): RefsCommands {
  return {
    list(filter, tags = NO_FILTER) {
      const proj = filterByTags(refsInDir(projectRefsDir(cwd)), tags)
      const glob = filterByTags(refsInDir(globalRefsDir()), tags)
      if (filter === 'project') return ok([...proj.keys()].sort().join('\n'))
      if (filter === 'global') return ok([...glob.keys()].sort().join('\n'))
      if (filter === 'all') {
        const names = new Set([...proj.keys(), ...glob.keys()])
        return ok([...names].sort().map(name => {
          if (proj.has(name) && glob.has(name)) return `${name}\t[project] (shadows global)`
          if (proj.has(name)) return `${name}\t[project]`
          return `${name}\t[global]`
        }).join('\n'))
      }
      const merged = new Map<string, Scope>()
      for (const n of glob.keys()) merged.set(n, 'global')
      for (const n of proj.keys()) merged.set(n, 'project')
      return ok([...merged.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, scope]) => `${name}\t[${scope}]`)
        .join('\n'))
    },
    listNames(tags = NO_FILTER) {
      const proj = filterByTags(refsInDir(projectRefsDir(cwd)), tags)
      const glob = filterByTags(refsInDir(globalRefsDir()), tags)
      const names = new Set<string>([...proj.keys(), ...glob.keys()])
      return ok([...names].sort().join('\n'))
    },
    listTags() {
      const tags = new Set<string>()
      for (const file of refsInDir(projectRefsDir(cwd)).values()) for (const t of refTags(file)) tags.add(t)
      for (const file of refsInDir(globalRefsDir()).values()) for (const t of refTags(file)) tags.add(t)
      return ok([...tags].sort().join('\n'))
    },
    show(name, scope) {
      const resolved = resolveRef(name, scope, cwd)
      if (!resolved.ok) return resolved
      return readRefFile(resolved.value)
    },
    path(name, scope) {
      return resolveRef(name, scope, cwd)
    },
    shadowed() {
      const proj = refsInDir(projectRefsDir(cwd))
      const glob = refsInDir(globalRefsDir())
      return ok([...proj.keys()].filter(n => glob.has(n)).sort().join('\n'))
    },
    dir(scope) {
      if (scope) return ok(scopeDir(scope, cwd))
      return ok(`project\t${projectRefsDir(cwd)}\nglobal\t${globalRefsDir()}`)
    },
  }
}
