#!/usr/bin/env node
import { defineCLI, ok, err, builtins } from 'jimkit-cli'
import { addTicket } from './commands/add.js'
import { listTickets } from './commands/tickets.js'
import { initProject } from './commands/init.js'
import { printOrchestrator } from './commands/orchestrator.js'
import { makeHooksCommands, VALID_EVENTS } from './commands/hooks.js'
import { makeRefsCommands } from './commands/refs.js'
import { pickScope, pickScopeFilter, parseTicketsMode, parseHookEvent } from './cli-opts.js'
import { runLoop } from './loop.js'
import { runOnce } from './once.js'
import { spawnSync } from 'node:child_process'
import { ralphDir } from './ralph-dir.js'
import { type Result } from './lib/result.js'

const completionsBuiltin = builtins.completions()
const refsCmds = makeRefsCommands()
const hooksCmds = makeHooksCommands()

function exitOnErr(r: Result<string, string>): Result<string, string> {
  if (!r.ok) {
    if (r.error) console.error(r.error)
    process.exit(r.exitCode ?? 1)
  }
  return r
}

const cli = defineCLI({
  name: 'ralph',
  version: '0.1.0',
  description: 'Autonomous coding agent loop',
  defaultCommand: 'loop',
  completers: {
    dynamic: {
      ticketIds: { cmd: 'ralph tickets --ids-only all', label: 'tickets' },
      hookNames: { cmd: 'ralph hooks list --names-only', label: 'hooks' },
      refNames: { cmd: 'ralph refs list --names-only', label: 'refs' },
    },
    static: {
      events: [...VALID_EVENTS],
      ticketModes: ['pending', 'done', 'failed', 'draft', 'all'],
      ...completionsBuiltin.completers?.static,
    },
  },
  commands: {
    loop: {
      description: 'Run loop until all tickets done or max iterations hit',
      args: {
        maxIter: { type: 'number', description: 'Maximum iterations (default 20)' },
      },
    },
    once: {
      description: 'Run one ticket, then stop',
    },
    init: {
      description: 'Scaffold .ralph/ state directory in current project',
    },
    orchestrator: {
      description: 'Print orchestrator (planner) instructions to stdout',
    },
    add: {
      description: 'Add a ticket',
      args: {
        title: { type: 'string', required: true },
      },
      options: {
        priority: { type: 'number', short: 'p', default: 10, description: 'Lower = higher priority' },
        description: { type: 'string', short: 'd', default: '', description: 'Ticket description' },
      },
    },
    tickets: {
      description: 'List tickets by status',
      args: {
        mode: { type: 'string', completeWith: 'ticketModes', description: 'pending|done|failed|draft|all' },
      },
      options: {
        idsOnly: { type: 'boolean', description: 'Print only ticket IDs (for completions)' },
      },
    },
    build: {
      description: 'Build the ralph container image',
    },
    hooks: {
      description: 'Manage lifecycle hooks',
      subcommands: {
        list: {
          description: 'List hooks',
          args: {
            event: { type: 'string', completeWith: 'events', description: 'Filter by event' },
          },
          options: {
            namesOnly: { type: 'boolean', description: 'Print only hook names (for completions)' },
          },
        },
        add: {
          description: 'Symlink a script into hooks.d/<event>/',
          args: {
            event: { type: 'string', required: true, completeWith: 'events' },
            script: { type: 'string', required: true },
          },
        },
        rm: {
          description: 'Remove a hook',
          args: {
            event: { type: 'string', required: true, completeWith: 'events' },
            name: { type: 'string', required: true, completeWith: 'hookNames' },
          },
        },
      },
    },
    refs: {
      description: 'Read global + project reference docs',
      subcommands: {
        list: {
          description: 'List refs (merged, project wins)',
          options: {
            global: { type: 'boolean', description: 'Only global refs' },
            project: { type: 'boolean', description: 'Only project refs' },
            all: { type: 'boolean', description: 'Show both scopes, mark shadowed' },
            namesOnly: { type: 'boolean', description: 'Print deduped names only (for completions)' },
          },
        },
        show: {
          description: 'Print ref content to stdout',
          args: {
            name: { type: 'string', required: true, completeWith: 'refNames' },
          },
          options: {
            global: { type: 'boolean', description: 'Force global scope' },
            project: { type: 'boolean', description: 'Force project scope' },
          },
        },
        path: {
          description: 'Print absolute path of a ref',
          args: {
            name: { type: 'string', required: true, completeWith: 'refNames' },
          },
          options: {
            global: { type: 'boolean', description: 'Force global scope' },
            project: { type: 'boolean', description: 'Force project scope' },
          },
        },
        shadowed: {
          description: 'List project refs that shadow a same-name global ref',
        },
        dir: {
          description: 'Print the refs base directory (both scopes by default)',
          options: {
            global: { type: 'boolean', description: 'Only the global dir' },
            project: { type: 'boolean', description: 'Only the project dir' },
          },
        },
      },
    },
    completions: completionsBuiltin.command,
  },
})

cli.run(process.argv, {
  loop: async (args) => exitOnErr(await runLoop(args.maxIter ?? 20)),
  once: async () => exitOnErr(await runOnce()),
  init: () => {
    const r = initProject()
    if (!r.ok) return r
    const lines = r.value.map(m =>
      m.created ? `Created ${m.path}` : `${m.path} already exists`,
    )
    lines.push('Ready for ralph. Add tickets with: ralph add "title" [-p priority] [-d description]')
    return ok(lines.join('\n'))
  },
  orchestrator: () => ok(printOrchestrator()),
  add: (args, opts) =>
    addTicket(args.title, opts.priority, opts.description),
  tickets: (args, opts) => {
    const mode = parseTicketsMode(args.mode)
    if (!mode.ok) return mode
    return listTickets(mode.value, opts.idsOnly ?? false)
  },
  build: () => {
    const r = spawnSync('podman', ['build', '-t', 'ralph', ralphDir()], { stdio: 'inherit' })
    return exitOnErr(r.status === 0 ? ok('') : err('', r.status ?? 1))
  },
  'hooks.list': (args, opts) => {
    if (opts.namesOnly) return hooksCmds.listNames()
    if (!args.event) return hooksCmds.list()
    const event = parseHookEvent(args.event)
    if (!event.ok) return event
    return hooksCmds.list(event.value)
  },
  'hooks.add': (args) => {
    const event = parseHookEvent(args.event)
    if (!event.ok) return event
    return hooksCmds.add(event.value, args.script)
  },
  'hooks.rm': (args) => {
    const event = parseHookEvent(args.event)
    if (!event.ok) return event
    return hooksCmds.remove(event.value, args.name)
  },
  'refs.list': (_args, opts) => {
    if (opts.namesOnly) return refsCmds.listNames()
    const filter = pickScopeFilter(opts)
    if (!filter.ok) return filter
    return refsCmds.list(filter.value)
  },
  'refs.show': (args, opts) => {
    const scope = pickScope(opts)
    if (!scope.ok) return scope
    return refsCmds.show(args.name, scope.value)
  },
  'refs.path': (args, opts) => {
    const scope = pickScope(opts)
    if (!scope.ok) return scope
    return refsCmds.path(args.name, scope.value)
  },
  'refs.shadowed': () => refsCmds.shadowed(),
  'refs.dir': (_args, opts) => {
    const scope = pickScope(opts)
    if (!scope.ok) return scope
    return refsCmds.dir(scope.value)
  },
  completions: (args) =>
    ok(cli.completion(args.shell as 'bash' | 'zsh' | 'fish')),
})
