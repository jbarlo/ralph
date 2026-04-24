import { existsSync, readdirSync, lstatSync, readlinkSync, symlinkSync, unlinkSync, chmodSync, statSync, type Stats } from 'node:fs'
import { resolve, basename, join } from 'node:path'
import { resolveState } from '../state.js'
import { ok, err, type Result } from '../lib/result.js'

export const VALID_EVENTS = ['on-start', 'on-complete', 'on-error'] as const
export type HookEvent = typeof VALID_EVENTS[number]

export type HooksCommands = {
  list(event?: HookEvent): Result<string, string>
  listNames(): Result<string, string>
  add(event: HookEvent, script: string): Result<string, string>
  remove(event: HookEvent, name: string): Result<string, string>
}

export function makeHooksCommands(cwd?: string): HooksCommands {
  const eventDir = (event: HookEvent) => join(resolveState(cwd).hooksDir, event)

  const formatEntry = (dir: string, name: string): Result<string, string> => {
    const full = join(dir, name)
    const st = safeLstat(full)
    if (!st.ok) return st
    const executable = (st.value.mode & 0o111) !== 0
    const status = executable ? '[enabled]' : '[disabled]'
    if (st.value.isSymbolicLink()) {
      const target = safeReadlink(full)
      if (!target.ok) return target
      return ok(`  ${name} ${status} -> ${target.value}`)
    }
    return ok(`  ${name} ${status}`)
  }

  const listOneEvent = (event: HookEvent): Result<string, string> => {
    const dir = eventDir(event)
    const lines = [`${event}:`]
    if (!existsSync(dir)) {
      lines.push('  (directory not found)')
      return ok(lines.join('\n'))
    }
    const entries = safeReaddir(dir)
    if (!entries.ok) return entries
    const visible = entries.value.filter(n => n !== '.gitkeep').sort()
    if (visible.length === 0) {
      lines.push('  (no hooks)')
      return ok(lines.join('\n'))
    }
    for (const name of visible) {
      const line = formatEntry(dir, name)
      if (!line.ok) return line
      lines.push(line.value)
    }
    return ok(lines.join('\n'))
  }

  return {
    list(event) {
      if (event) return listOneEvent(event)
      const parts: string[] = []
      for (const ev of VALID_EVENTS) {
        const r = listOneEvent(ev)
        if (!r.ok) return r
        parts.push(r.value)
      }
      return ok(parts.join('\n'))
    },

    listNames() {
      const names = new Set<string>()
      for (const ev of VALID_EVENTS) {
        const dir = eventDir(ev)
        if (!existsSync(dir)) continue
        const entries = safeReaddir(dir)
        if (!entries.ok) return entries
        for (const n of entries.value) if (n !== '.gitkeep') names.add(n)
      }
      return ok([...names].sort().join('\n'))
    },

    add(event, script) {
      const exists = safeStat(script)
      if (!exists.ok) return err(`Script '${script}' not found`, 1)
      if (!exists.value.isFile()) return err(`Script '${script}' is not a regular file`, 1)

      const dir = eventDir(event)
      if (!existsSync(dir)) return err(`${dir} directory not found. Run 'ralph init' first.`, 1)

      const absScript = resolve(script)
      const name = basename(script)
      const target = join(dir, name)
      if (existsSync(target)) return err(`Hook '${name}' already exists in ${event}`, 1)

      const linked = safeSymlink(absScript, target)
      if (!linked.ok) return linked
      const chmod = safeChmod(target, 0o755)
      if (!chmod.ok) return chmod
      return ok(`Added hook: ${name} -> ${event}`)
    },

    remove(event, name) {
      const target = join(eventDir(event), name)
      if (!existsSync(target)) return err(`Hook '${name}' not found in ${event}`, 1)
      const r = safeUnlink(target)
      if (!r.ok) return r
      return ok(`Removed hook: ${name} from ${event}`)
    },
  }
}

// fs leaves

function safeStat(path: string): Result<Stats, string> {
  try { return ok(statSync(path)) }
  catch (e) { return err(`stat ${path}: ${e instanceof Error ? e.message : String(e)}`, 1) }
}

function safeLstat(path: string): Result<Stats, string> {
  try { return ok(lstatSync(path)) }
  catch (e) { return err(`lstat ${path}: ${e instanceof Error ? e.message : String(e)}`, 1) }
}

function safeReadlink(path: string): Result<string, string> {
  try { return ok(readlinkSync(path)) }
  catch (e) { return err(`readlink ${path}: ${e instanceof Error ? e.message : String(e)}`, 1) }
}

function safeReaddir(path: string): Result<string[], string> {
  try { return ok(readdirSync(path)) }
  catch (e) { return err(`readdir ${path}: ${e instanceof Error ? e.message : String(e)}`, 1) }
}

function safeSymlink(target: string, path: string): Result<void, string> {
  try { symlinkSync(target, path); return ok(undefined) }
  catch (e) { return err(`symlink ${path} -> ${target}: ${e instanceof Error ? e.message : String(e)}`, 1) }
}

function safeChmod(path: string, mode: number): Result<void, string> {
  try { chmodSync(path, mode); return ok(undefined) }
  catch (e) { return err(`chmod ${path}: ${e instanceof Error ? e.message : String(e)}`, 1) }
}

function safeUnlink(path: string): Result<void, string> {
  try { unlinkSync(path); return ok(undefined) }
  catch (e) { return err(`unlink ${path}: ${e instanceof Error ? e.message : String(e)}`, 1) }
}
