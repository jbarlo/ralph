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
```

## Files scaffolded per-project

- `.ralph/tickets.json` — queue
- `.ralph/progress.txt` — append-only log
- `.ralph/hooks.d/{on-start,on-complete,on-error}/` — lifecycle hooks
- `flake.nix` — per-project devshell activated inside the container via the image's `claude` wrapper

## Shell completions

```sh
eval "$(ralph completions zsh)"
```
