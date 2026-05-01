# Ralph Loop Commands

# List available commands
default:
    @just --list

# Compile the ralph binary
build-cli:
    bun build src/cli.ts --compile --outfile ralph

# Build the CLI and podman image, then pre-warm so the first real run is fast
build: build-cli && prewarm
    podman build -t ralph \
      --build-arg AGENT_UID=$(id -u) \
      --build-arg AGENT_GID=$(id -g) \
      .

# Pre-warm keep-id layer cache so the first real run isn't a slow id-map copy
prewarm:
    podman run --rm --userns=keep-id ralph true

# Clean up busy overlay mounts left by an interrupted keep-id run
unstick:
    @if podman ps -q | grep -q .; then \
      echo "abort: live podman containers exist — stop them first (podman ps)"; \
      exit 1; \
    fi
    @tempdirs=$HOME/.local/share/containers/storage/overlay/tempdirs; \
    podman unshare sh -c "cd $tempdirs 2>/dev/null && for d in *; do \
      [ -e \"\$d\" ] || continue; \
      find \"\$d\" -name merged -type d -exec umount {} + 2>/dev/null; \
      rm -rf \"\$d\"; \
    done" || true
    @echo "storage cleaned"

# Run loop mode (all tickets until done)
loop *args:
    ./ralph loop {{args}}

# Run once mode (one ticket, then stop)
once:
    ./ralph once

# Initialize ralph in current directory
init:
    ./ralph init

# Show remaining tickets
tickets:
    @./ralph tickets

# Show completed tickets
done:
    @./ralph tickets done

# Show all tickets
all:
    @./ralph tickets all

# Add a new ticket
add title priority="10" description="":
    @./ralph add "{{title}}" -p {{priority}} -d "{{description}}"

# Run tests
test:
    bun vitest run

# Show progress log
progress:
    cat .ralph/progress.txt

# Clean podman image
clean:
    podman rmi ralph
