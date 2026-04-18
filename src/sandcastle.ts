import { run, claudeCode } from '@ai-hero/sandcastle'
import { podman } from '@ai-hero/sandcastle/sandboxes/podman'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ralphDir } from './ralph-dir.js'

const AUTH_COPY = [
  'mkdir -p /home/agent/.claude',
  'cp -r /claude-host/. /home/agent/.claude/ 2>/dev/null',
  'cp /claude-host.json /home/agent/.claude.json 2>/dev/null',
  'true',
].join('; ')

export async function runRalphContainer(): Promise<number> {
  const prompt = readFileSync(join(ralphDir(), 'prompt.md'), 'utf8')

  try {
    await run({
      agent: claudeCode('claude-opus-4-6'),
      sandbox: podman({
        imageName: 'ralph',
        mounts: [
          { hostPath: '~/.claude', sandboxPath: '/claude-host', readonly: true },
          { hostPath: '~/.claude.json', sandboxPath: '/claude-host.json', readonly: true },
        ],
        env: {
          NIX_STATE_DIR: '/home/agent/.nix-state',
        },
      }),
      prompt,
      hooks: {
        onSandboxReady: [{ command: AUTH_COPY }],
      },
      logging: { type: 'stdout' },
    })
    return 0
  } catch (e) {
    console.error((e as Error).message)
    return 1
  }
}
