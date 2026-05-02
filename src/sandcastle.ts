import { run, claudeCode } from '@ai-hero/sandcastle'
import { podman } from '@ai-hero/sandcastle/sandboxes/podman'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ralphDir } from './ralph-dir.js'
import { globalRefsDir } from './refs-dir.js'

const AUTH_COPY = [
  'mkdir -p /home/agent/.claude',
  'cp -r /claude-host/. /home/agent/.claude/ 2>/dev/null',
  'cp /claude-host.json /home/agent/.claude.json 2>/dev/null',
  'true',
].join('; ')

export type RunOptions = {
  logFile?: string
}

export async function runRalphContainer(opts: RunOptions = {}): Promise<number> {
  const prompt = readFileSync(join(ralphDir(), 'prompt.md'), 'utf8')

  const globalRefs = globalRefsDir()
  const mounts = [
    { hostPath: '~/.claude', sandboxPath: '/claude-host', readonly: true },
    { hostPath: '~/.claude.json', sandboxPath: '/claude-host.json', readonly: true },
  ]
  if (existsSync(globalRefs)) {
    mounts.push({ hostPath: globalRefs, sandboxPath: '/ralph-global/refs', readonly: true })
  }

  try {
    await run({
      agent: claudeCode('claude-opus-4-6'),
      sandbox: podman({
        imageName: 'ralph',
        mounts,
        env: {
          NIX_STATE_DIR: '/home/agent/.nix-state',
          RALPH_GLOBAL_DIR: '/ralph-global',
          RALPH_IN_SANDBOX: '1',
        },
      }),
      prompt,
      hooks: {
        onSandboxReady: [{ command: AUTH_COPY }],
      },
      logging: opts.logFile ? { type: 'file', path: opts.logFile } : { type: 'stdout' },
    })
    return 0
  } catch (e) {
    console.error((e as Error).message)
    return 1
  }
}
