import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { ok, err, type Result } from '../lib/result.js'

const FLAKE_TEMPLATE = `{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            nodejs_22
            pnpm
            jq
          ];
        };
      });
}
`

export type InitMessage = { path: string; created: boolean }

export function initProject(cwd: string = process.cwd()): Result<InitMessage[], string> {
  const results: InitMessage[] = []

  const dotRalph = ensureDir(join(cwd, '.ralph'), '.ralph/')
  if (!dotRalph.ok) return dotRalph
  results.push(dotRalph.value)

  for (const step of [
    () => ensureTickets(cwd),
    () => ensureFile(cwd, 'flake.nix', FLAKE_TEMPLATE),
    () => ensureProgress(cwd),
    () => ensureHooks(cwd),
    () => ensureLogs(cwd),
  ]) {
    const r = step()
    if (!r.ok) return r
    results.push(r.value)
  }

  return ok(results)
}

function ensureDir(path: string, label: string): Result<InitMessage, string> {
  if (existsSync(path)) return ok({ path: label, created: false })
  const r = safeMkdir(path)
  if (!r.ok) return r
  return ok({ path: label, created: true })
}

function ensureTickets(cwd: string): Result<InitMessage, string> {
  const dotTickets = join(cwd, '.ralph/tickets.json')
  if (existsSync(dotTickets)) return ok({ path: '.ralph/tickets.json', created: false })
  const r = safeWriteFile(dotTickets, JSON.stringify({ tickets: [] }, null, 2) + '\n')
  if (!r.ok) return r
  return ok({ path: '.ralph/tickets.json', created: true })
}

function ensureProgress(cwd: string): Result<InitMessage, string> {
  const dotProgress = join(cwd, '.ralph/progress.txt')
  if (existsSync(dotProgress)) return ok({ path: '.ralph/progress.txt', created: false })
  const r = safeWriteFile(dotProgress, '# Ralph Progress Log\n')
  if (!r.ok) return r
  return ok({ path: '.ralph/progress.txt', created: true })
}

function ensureHooks(cwd: string): Result<InitMessage, string> {
  const dotHooks = join(cwd, '.ralph/hooks.d')
  if (existsSync(dotHooks)) return ok({ path: '.ralph/hooks.d/', created: false })
  for (const ev of ['on-start', 'on-complete', 'on-error']) {
    const mk = safeMkdir(join(dotHooks, ev), { recursive: true })
    if (!mk.ok) return mk
    const gk = safeWriteFile(join(dotHooks, ev, '.gitkeep'), '')
    if (!gk.ok) return gk
  }
  return ok({ path: '.ralph/hooks.d/ (on-start, on-complete, on-error)', created: true })
}

function ensureLogs(cwd: string): Result<InitMessage, string> {
  const dotLogs = join(cwd, '.ralph/logs')
  if (existsSync(dotLogs)) return ok({ path: '.ralph/logs/', created: false })
  const mk = safeMkdir(dotLogs, { recursive: true })
  if (!mk.ok) return mk
  const gi = safeWriteFile(join(dotLogs, '.gitignore'), '*\n!.gitignore\n')
  if (!gi.ok) return gi
  return ok({ path: '.ralph/logs/', created: true })
}

function ensureFile(cwd: string, name: string, content: string): Result<InitMessage, string> {
  const path = join(cwd, name)
  if (existsSync(path)) return ok({ path: name, created: false })
  const mk = safeMkdir(dirname(path), { recursive: true })
  if (!mk.ok) return mk
  const w = safeWriteFile(path, content)
  if (!w.ok) return w
  return ok({ path: name, created: true })
}

function safeMkdir(path: string, options?: { recursive?: boolean }): Result<void, string> {
  try {
    mkdirSync(path, options)
    return ok(undefined)
  } catch (e) {
    return err(`Failed to create ${path}: ${e instanceof Error ? e.message : String(e)}`, 1)
  }
}

function safeWriteFile(path: string, content: string): Result<void, string> {
  try {
    writeFileSync(path, content)
    return ok(undefined)
  } catch (e) {
    return err(`Failed to write ${path}: ${e instanceof Error ? e.message : String(e)}`, 1)
  }
}
