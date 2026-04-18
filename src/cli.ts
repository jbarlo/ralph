#!/usr/bin/env node
import { defineCLI, ok, err, builtins } from 'jimkit-cli'
import { addTicket } from './commands/add.js'
import { listTickets, parseMode } from './commands/tickets.js'
import { stopContainer } from './commands/stop.js'
import { initProject } from './commands/init.js'
import { listAll, listEvent, listNames, addHook, removeHook, isValidEvent, VALID_EVENTS } from './commands/hooks.js'
import { runLoop } from './loop.js'
import { runOnce } from './once.js'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const RALPH_DIR = join(HERE, '..')

const completionsBuiltin = builtins.completions()

const invalidEvent = (event: string) =>
  err(`Invalid event '${event}'. Valid: ${VALID_EVENTS.join(', ')}`, 1)

const cli = defineCLI({
  name: 'ralph',
  version: '0.1.0',
  description: 'Autonomous coding agent loop',
  defaultCommand: 'loop',
  completers: {
    dynamic: {
      ticketIds: { cmd: 'ralph tickets --ids-only all', label: 'tickets' },
      hookNames: { cmd: 'ralph hooks list --names-only', label: 'hooks' },
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
    stop: {
      description: 'Stop and remove the ralph container',
    },
    build: {
      description: 'Build the ralph docker image',
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
    completions: completionsBuiltin.command,
  },
})

cli.run(process.argv, {
  loop: async (args) => {
    const code = await runLoop(args.maxIter ?? 20)
    if (code !== 0) process.exit(code)
    return ok(undefined)
  },
  once: async () => {
    const code = await runOnce()
    if (code !== 0) process.exit(code)
    return ok(undefined)
  },
  init: () => {
    const lines = initProject().map(r =>
      r.created ? `Created ${r.path}` : `${r.path} already exists`,
    )
    lines.push('Ready for ralph. Add tickets with: ralph add "title" [-p priority] [-d description]')
    return ok(lines.join('\n'))
  },
  add: (args, opts) =>
    ok(addTicket(args.title, opts.priority, opts.description)),
  tickets: (args, opts) =>
    ok(listTickets(parseMode(args.mode), opts.idsOnly ?? false)),
  stop: () =>
    ok(stopContainer()),
  build: () => {
    const r = spawnSync('docker', ['build', '-t', 'ralph', RALPH_DIR], { stdio: 'inherit' })
    if (r.status !== 0) process.exit(r.status ?? 1)
    return ok(undefined)
  },
  'hooks.list': (args, opts) => {
    if (opts.namesOnly) return ok(listNames())
    if (args.event) {
      if (!isValidEvent(args.event)) return invalidEvent(args.event)
      return ok(listEvent(args.event))
    }
    return ok(listAll())
  },
  'hooks.add': (args) => {
    if (!isValidEvent(args.event)) return invalidEvent(args.event)
    return ok(addHook(args.event, args.script))
  },
  'hooks.rm': (args) => {
    if (!isValidEvent(args.event)) return invalidEvent(args.event)
    return ok(removeHook(args.event, args.name))
  },
  completions: (args) =>
    ok(cli.completion(args.shell as 'bash' | 'zsh' | 'fish')),
})
