import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

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

type InitMessage = { path: string; created: boolean }

export function initProject(cwd: string = process.cwd()): InitMessage[] {
  const results: InitMessage[] = []

  const dotRalph = join(cwd, '.ralph')
  if (!existsSync(dotRalph)) {
    mkdirSync(dotRalph)
    results.push({ path: '.ralph/', created: true })
  } else {
    results.push({ path: '.ralph/', created: false })
  }

  results.push(ensureTickets(cwd))
  results.push(ensureFile(cwd, 'flake.nix', FLAKE_TEMPLATE))
  results.push(ensureProgress(cwd))
  results.push(ensureHooks(cwd))

  return results
}

function ensureTickets(cwd: string): InitMessage {
  const dotTickets = join(cwd, '.ralph/tickets.json')
  if (existsSync(dotTickets)) return { path: '.ralph/tickets.json', created: false }
  writeFileSync(dotTickets, JSON.stringify({ tickets: [] }, null, 2) + '\n')
  return { path: '.ralph/tickets.json', created: true }
}

function ensureProgress(cwd: string): InitMessage {
  const dotProgress = join(cwd, '.ralph/progress.txt')
  if (existsSync(dotProgress)) return { path: '.ralph/progress.txt', created: false }
  writeFileSync(dotProgress, '# Ralph Progress Log\n')
  return { path: '.ralph/progress.txt', created: true }
}

function ensureHooks(cwd: string): InitMessage {
  const dotHooks = join(cwd, '.ralph/hooks.d')
  if (existsSync(dotHooks)) return { path: '.ralph/hooks.d/', created: false }
  for (const ev of ['on-start', 'on-complete', 'on-error']) {
    mkdirSync(join(dotHooks, ev), { recursive: true })
    writeFileSync(join(dotHooks, ev, '.gitkeep'), '')
  }
  return { path: '.ralph/hooks.d/ (on-start, on-complete, on-error)', created: true }
}

function ensureFile(cwd: string, name: string, content: string): InitMessage {
  const path = join(cwd, name)
  if (existsSync(path)) return { path: name, created: false }
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content)
  return { path: name, created: true }
}
