import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
export const RALPH_DIR = join(HERE, '..')

export function inGitRepo(): boolean {
  const r = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { stdio: 'ignore' })
  return r.status === 0
}

export function resolveGitConfig(): string | undefined {
  const home = homedir()
  const direct = join(home, '.gitconfig')
  if (existsSync(direct)) return direct
  const xdg = join(home, '.config/git/config')
  if (existsSync(xdg)) return xdg
  return undefined
}

export function currentCommit(): string {
  const r = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' })
  return r.status === 0 ? r.stdout.trim() : ''
}

export function ralphContainerRunning(): boolean {
  const r = spawnSync('docker', ['ps', '--format', '{{.Names}}'], { encoding: 'utf8' })
  if (r.status !== 0) return false
  return r.stdout.split('\n').some(n => n.trim() === 'ralph')
}

export function ralphContainerExists(): boolean {
  const r = spawnSync('docker', ['ps', '-a', '--format', '{{.Names}}'], { encoding: 'utf8' })
  if (r.status !== 0) return false
  return r.stdout.split('\n').some(n => n.trim() === 'ralph')
}

export function removeExitedRalphContainer(): void {
  const r = spawnSync('docker', ['ps', '-a', '--filter', 'status=exited', '--format', '{{.Names}}'], { encoding: 'utf8' })
  if (r.status !== 0) return
  if (r.stdout.split('\n').some(n => n.trim() === 'ralph')) {
    spawnSync('docker', ['rm', 'ralph'], { stdio: 'ignore' })
  }
}

export function verifyClaudeAuth(loop: boolean): { ok: boolean; stderr: string } {
  const home = homedir()
  const args = ['run', '--rm']
  if (loop) args.push('--userns=host')
  args.push('-v', `${join(home, '.claude')}:/claude-host:ro`)
  args.push('-v', `${join(home, '.claude.json')}:/claude-host.json:ro`)
  args.push('ralph', 'claude', '--version')
  const r = spawnSync('docker', args, { encoding: 'utf8' })
  return { ok: r.status === 0, stderr: r.stderr ?? '' }
}

type RunOptions = {
  loop: boolean
  cwd?: string
}

export function runRalphContainer(opts: RunOptions): number {
  const cwd = opts.cwd ?? process.cwd()
  const home = homedir()
  const tty = process.stdin.isTTY
  const gitconfig = resolveGitConfig()

  const args: string[] = ['run', '--name', 'ralph']
  if (opts.loop) args.push('--userns=host')
  args.push(tty ? '-it' : '-i')
  if (opts.loop) args.push('-e', 'RALPH_LOOP=1')
  args.push('-v', `${cwd}:/workspace`)
  args.push('-v', `${join(cwd, 'RALPH.md')}:/workspace/CLAUDE.md:ro`)
  args.push('-v', `${join(home, '.claude')}:/claude-host:ro`)
  args.push('-v', `${join(home, '.claude.json')}:/claude-host.json:ro`)
  if (gitconfig) {
    if (opts.loop) {
      args.push('-v', `${gitconfig}:/home/ralph/.gitconfig-host:ro`)
      args.push('-e', 'GIT_CONFIG_SYSTEM=/home/ralph/.gitconfig-host')
    } else {
      args.push('-v', `${gitconfig}:/home/ralph/.gitconfig:ro`)
    }
  }
  args.push('-v', `${join(RALPH_DIR, 'prompt.md')}:/ralph/prompt.md:ro`)
  args.push('ralph', '/ralph/ralph-once.sh')

  const r = spawnSync('docker', args, { stdio: 'inherit' })
  return r.status ?? 1
}
