# Ralph Todo

Issues encountered during development that should be fixed upstream.

## CLAUDE.md overwritten by RALPH.md mount

The container mounts `RALPH.md` as `CLAUDE.md` (`-v "$(pwd)/RALPH.md":/workspace/CLAUDE.md:ro`). When ralph commits, it sees CLAUDE.md as modified (because the mount replaced it) and includes the diff in every commit. This makes commits noisy — every ralph commit shows CLAUDE.md changing even though it's not a real change.

The host's CLAUDE.md and RALPH.md are separate files with different purposes. The mount conflates them. Possible fixes:
- Mount RALPH.md to a different path and tell claude to read it via a flag or env var
- Add CLAUDE.md to ralph's git commit exclude list
- Have ralph `git checkout -- CLAUDE.md` before committing

## Container permissions

Ralph container runs as UID 100999. Files created by ralph (tickets.json, .next/, data/) require `sudo chown` on the host before the orchestrator can modify them. This is the most frequent papercut.

Possible fixes:
- Run container with `--user $(id -u):$(id -g)` to match host UID
- Post-iteration hook that chowns workspace files back to host user
- Use `core.sharedRepository group` (already attempted, blocked by gitconfig write issue)

## Container can't reach private GitHub repos

Ralph can't `pnpm install` deps from private git URLs (e.g., `jimstack-env`, `@jimstack/cli`). It vendors stubs instead. Current workaround: pre-install deps on the host.

Possible fixes:
- Mount SSH keys or GitHub token into container
- Support a `--pre-install` flag that runs pnpm install on the host before container starts

## Container can't install shadcn components

`npx shadcn add <component>` needs to run on the host. Ralph creates placeholder stubs and notes missing components in progress log.

Possible fixes:
- Pre-install all likely components before ralph runs
- Allow ralph to request components via a hook that runs on the host

## tickets.json structure mangling

Ralph occasionally rewrites tickets.json as a bare array `[...]` instead of `{"tickets": [...]}`. This breaks the ralph loop's jq queries on the next iteration.

Possible fixes:
- Validate tickets.json structure in ralph-once before/after each iteration
- Add a json schema check to the loop

## Stale container blocks next iteration

`ralph` loop fails with "Container 'ralph' is already running" if a previous iteration's container didn't clean up. Requires manual `ralph-stop`.

Possible fixes:
- Auto-stop stale containers at loop start
- Add a timeout to container runs

## gitconfig "Device or resource busy"

Fixed by writing to `/tmp/ralph-gitconfig` via `GIT_CONFIG_GLOBAL` env var in entrypoint.sh. Root cause still unknown — may be Docker overlay filesystem issue.

## .claude.json not mounted

Fixed by adding `-v ~/.claude.json:/claude-host.json:ro` bind mount to ralph-once and ralph scripts, plus copy in entrypoint.sh.

## pnpm-store committed to git

Ralph committed `.pnpm-store/` (14k files, 130MB). Fixed by adding to .gitignore and running git filter-branch. Prevention: `.pnpm-store` is now in the project-setup ref's gitignore template.

## Rewrite ralph CLI with jimstack/cli

The ralph shell scripts (ralph, ralph-once, ralph-add, etc.) could be rewritten as a proper TypeScript CLI using @jimstack/cli. Type-safe commands, Result types, better error handling than bash set -e. Would also make the loop logic testable.

## Nesting on scaffold

Ralph interprets "create next app" as "create a subdirectory." Ticket wording needs to explicitly say "scaffold in the current directory" or "do not create a subdirectory."
