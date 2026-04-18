import { execFileSync, spawnSync } from 'node:child_process'

export function stopContainer(): string {
  const list = spawnSync('docker', ['ps', '-a', '--format', '{{.Names}}'], { encoding: 'utf8' })
  if (list.status !== 0) throw new Error('docker ps failed')
  const names = list.stdout.split('\n').map(s => s.trim())
  if (!names.includes('ralph')) return 'No ralph container found.'
  execFileSync('docker', ['rm', '-f', 'ralph'], { stdio: 'inherit' })
  return 'Done.'
}
