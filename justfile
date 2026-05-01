# Ralph Loop Commands

# List available commands
default:
    @just --list

# Compile the ralph binary
build-cli:
    bun build src/cli.ts --compile --outfile ralph

# Build the CLI and podman image
build: build-cli
    podman build -t ralph \
      --build-arg AGENT_UID=$(id -u) \
      --build-arg AGENT_GID=$(id -g) \
      .

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
