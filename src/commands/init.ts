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

const RALPH_MD = `# Ralph Executor Instructions

You are ralph, an autonomous coding agent running in a loop. Your job is to complete ONE ticket per iteration.

## Workflow

1. Read \`.ralph/tickets.json\` and review tickets where \`status\` is \`"pending"\`.
2. Pick the best ticket (priority is a hint; use judgment for dependencies).
3. Set the ticket's \`status\` to \`"in_progress"\`.
4. Complete the ticket.
5. Review touched files for comment hygiene (see **Comments**).
6. Run relevant tests / type checks.
7. Set \`status\` to \`"completed"\` (or \`"failed"\` if unable).
8. Append a summary to \`.ralph/progress.txt\`.
9. Exit.

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

## Ticket Status Values

- \`draft\` - Work in progress, **ignore these** (not ready for execution)
- \`pending\` - Not started, ready to be worked on
- \`in_progress\` - Currently being worked on
- \`completed\` - Done and verified
- \`failed\` - Could not complete

## Important Rules

- Work on only ONE ticket per iteration
- Priority is a hint, not a strict order — use judgment for dependencies
- Keep changes small and focused
- Run tests / type checks before marking complete
- **For bugfixes: write an integration test** that reproduces the bug before fixing
- Append to progress.txt (never overwrite)
- Commit frequently for safety

## Comments

- Only keep comments that provide helpful context on purpose
- Declarative, not imperative (describe *what it is*, not *how it was introduced*)
- If variable/function name makes purpose clear, no comment needed
- Never: \`// Added for ticket #123\`, \`// Fixed bug where X\`, \`// TODO: already done\`
- Good: explaining non-obvious design decisions, clarifying intent where code alone isn't sufficient

## Coding Principles

- **Dependency Injection** - prefer DI patterns, avoid hardcoded dependencies
- **Railway-oriented development** - use Result types, chain operations, handle errors as values not exceptions
- **Integration tests over mocks** - test real behavior end-to-end, only mock at system boundaries
- **Derived over synced** - prefer derived values over synchronized state

## Progress Log

Append to \`.ralph/progress.txt\` after each ticket:
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
