import { existsSync, readdirSync, lstatSync, readlinkSync, symlinkSync, unlinkSync, chmodSync, statSync } from 'node:fs'
import { resolve, basename, dirname, join } from 'node:path'
import { resolveState } from '../state.js'

export const VALID_EVENTS = ['on-start', 'on-complete', 'on-error'] as const
export type HookEvent = typeof VALID_EVENTS[number]

export function isValidEvent(s: string): s is HookEvent {
  return (VALID_EVENTS as readonly string[]).includes(s)
}

function eventDir(event: HookEvent): string {
  return join(resolveState().hooksDir, event)
}

export function listEvent(event: HookEvent): string {
  const dir = eventDir(event)
  const lines = [`${event}:`]
  if (!existsSync(dir)) {
    lines.push('  (directory not found)')
    return lines.join('\n')
  }
  const entries = readdirSync(dir).sort()
    .filter(n => n !== '.gitkeep')
    .map(n => formatEntry(dir, n))
  if (entries.length === 0) lines.push('  (no hooks)')
  else lines.push(...entries)
  return lines.join('\n')
}

export function listAll(): string {
  return VALID_EVENTS.map(listEvent).join('\n')
}

function formatEntry(dir: string, name: string): string {
  const full = join(dir, name)
  const st = lstatSync(full)
  const executable = (st.mode & 0o111) !== 0
  const status = executable ? '[enabled]' : '[disabled]'
  if (st.isSymbolicLink()) return `  ${name} ${status} -> ${readlinkSync(full)}`
  return `  ${name} ${status}`
}

export function addHook(event: HookEvent, script: string): string {
  if (!existsSync(script) || !statSync(script).isFile()) {
    throw new Error(`Script '${script}' not found`)
  }
  const dir = eventDir(event)
  if (!existsSync(dir)) {
    throw new Error(`${dir} directory not found. Run 'ralph init' first.`)
  }
  const absScript = resolve(script)
  const name = basename(script)
  const target = join(dir, name)
  if (existsSync(target)) {
    throw new Error(`Hook '${name}' already exists in ${event}`)
  }
  symlinkSync(absScript, target)
  chmodSync(target, 0o755)
  return `Added hook: ${name} -> ${event}`
}

export function removeHook(event: HookEvent, name: string): string {
  const target = join(eventDir(event), name)
  if (!existsSync(target)) {
    throw new Error(`Hook '${name}' not found in ${event}`)
  }
  unlinkSync(target)
  return `Removed hook: ${name} from ${event}`
}

export function listNames(): string {
  const out: string[] = []
  for (const ev of VALID_EVENTS) {
    const dir = eventDir(ev)
    if (!existsSync(dir)) continue
    for (const n of readdirSync(dir)) {
      if (n === '.gitkeep') continue
      out.push(n)
    }
  }
  return [...new Set(out)].sort().join('\n')
}
