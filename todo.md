# Ralph Todo

Issues encountered during development that should be fixed upstream.

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

Ralph occasionally rewrites tickets.json as a bare array `[...]` instead of `{"tickets": [...]}`. This breaks the ralph loop's queries on the next iteration.

Possible fixes:
- Validate tickets.json structure before/after each iteration
- Add a json schema check to the loop

## Nesting on scaffold

Ralph interprets "create next app" as "create a subdirectory." Ticket wording needs to explicitly say "scaffold in the current directory" or "do not create a subdirectory."
