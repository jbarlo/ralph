import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

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

const RALPH_MD = `# Ralph Executor Instructions

You are ralph, an autonomous coding agent. Complete ONE ticket per iteration.

## Workflow

1. Read \`.ralph/tickets.json\`, pick best incomplete ticket (priority is a hint, consider dependencies)
2. Set its \`status\` to \`"in_progress"\`
3. Complete the ticket
4. Verify with tests/type checks if applicable
5. Set \`status\` to \`"completed"\` (or \`"failed"\` if unable)
6. Append summary to \`.ralph/progress.txt\`
7. Exit (loop handles next iteration)

## Ticket Format

\`\`\`json
{
  "id": 1,
  "title": "Short title",
  "description": "Detailed description of what to do",
  "status": "pending",
  "priority": 1
}
\`\`\`

Status values: pending | in_progress | completed | failed

When starting a ticket, set status to "in_progress".
When done, set status to "completed" (or "failed" if unable to complete).

## Progress Log

Append to .ralph/progress.txt after each ticket:
\`\`\`
## Ticket #1: Short title
- What was done
- Files changed
- Tests run
\`\`\`

## Project-Specific Notes

Add project-specific instructions here:
- Tech stack
- Testing commands
- Code conventions

## Commits

Use conventional commits:
- \`feat: ...\` - new feature
- \`fix: ...\` - bug fix
- \`refactor: ...\` - code change (no new feature or fix)
- \`docs: ...\` - documentation only
- \`test: ...\` - adding/updating tests
- \`chore: ...\` - maintenance, deps, config
`

const CLAUDE_MD = `# Orchestrator Instructions

This is a Ralph Loop project. You are the orchestrator — your job is to PLAN, not execute.

## Your Role

- Understand the problem/codebase
- Break work into small, atomic tickets
- Write clear ticket descriptions with acceptance criteria
- Let ralph (the executor) do the implementation

## Guidelines

- Explore and understand before planning
- Reference actual code/data when writing tickets
- Don't write implementation code — that's ralph's job
- Keep tickets small (one clear task each)
- Include test/verification steps in descriptions

## Debugging

You CAN debug to understand problems, but only to write better tickets:
- Run tests to understand what's failing
- Read logs/errors to diagnose issues
- Trace code paths to understand behavior
- Write minimal repro cases if helpful for the ticket description

Do NOT fix bugs directly — instead, write a ticket describing:
- What's broken (with error messages/logs)
- Where the problem likely is
- What the fix should achieve

## Commands

\`\`\`bash
ralph add "title" [-p priority] [-d description]   # add ticket
ralph tickets                                       # view pending
ralph once                                          # run one ticket (test)
ralph loop                                          # run all tickets
\`\`\`

## Files

- .ralph/tickets.json: task queue (edit directly or use ralph add)
- .ralph/progress.txt: log of completed work
- .ralph/hooks.d/: lifecycle hooks
- RALPH.md: instructions for the executor (edit for project-specific guidance)
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
  results.push(ensureFile(cwd, 'RALPH.md', RALPH_MD))
  results.push(ensureFile(cwd, 'CLAUDE.md', CLAUDE_MD))
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
  writeFileSync(path, content)
  return { path: name, created: true }
}
