# ralph

Autonomous coding agent loop. Runs claude-code in a rootless podman container, iteration-by-iteration, against a ticket queue.

## Prerequisites

- **podman** — containers. Rootless mode is expected.
- **nix** (with flakes) — ralph's own devshell + the workspace's toolchain.
- **bun** — to build the ralph binary from source.
- **claude-code auth** — `~/.claude` and `~/.claude.json` set up on the host.

Your podman may need a minimal `~/.config/containers/policy.json` on first use:

```json
{ "default": [{"type": "insecureAcceptAnything"}] }
```

## Build

```sh
nix develop
bun install
bun build src/cli.ts --compile --outfile ralph
ralph build              # builds the container image
```

## Usage

```sh
cd my-project
ralph init               # scaffold .ralph/, flake.nix
ralph add "..." -p 5 -d "..."  # add a ticket
ralph tickets            # list pending
ralph once               # run one ticket
ralph loop [n]           # run up to n iterations (default 20)
ralph orchestrator       # print planner instructions (pipe into outer claude session)
ralph refs list          # list reference docs (project wins over global)
ralph refs show <name>   # print a reference doc (use --global / --project to force scope)
```

## Reference docs

Portable snippets the executor can pull in via `ralph refs show <name>`.

- **Global:** `${XDG_CONFIG_HOME}/ralph/refs/*.md` (platform-appropriate, via `env-paths`)
- **Project:** `.ralph/refs/*.md`

Project refs shadow global refs of the same name. Ref names are the posix-style relative path minus `.md`, so nested dirs work (`ralph refs show patterns/result-type`). Use `ralph refs shadowed` to surface silent overrides.

## Files scaffolded per-project

- `.ralph/tickets.json` — queue
- `.ralph/progress.txt` — append-only log
- `.ralph/hooks.d/{on-start,on-complete,on-error}/` — lifecycle hooks
- `flake.nix` — per-project devshell activated inside the container via the image's `claude` wrapper

## Shell completions

```sh
eval "$(ralph completions zsh)"
```
