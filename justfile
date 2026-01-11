# Ralph Loop Commands

# List available commands
default:
    @just --list

# Build the docker image
build:
    ./bin/ralph-build

# Run loop mode (all tickets until done)
loop *args:
    ./bin/ralph {{args}}

# Run once mode (one ticket, then stop)
once:
    ./bin/ralph-once

# Initialize ralph in current directory
init:
    ./bin/ralph-init

# Show remaining tickets
tickets:
    @./bin/ralph-tickets pending

# Show completed tickets
done:
    @./bin/ralph-tickets done

# Show all tickets
all:
    @./bin/ralph-tickets all

# Add a new ticket
add title priority="10" description="":
    @./bin/ralph-add "{{title}}" "{{priority}}" "{{description}}"

# Show progress log
progress:
    cat progress.txt

# Clean docker image
clean:
    docker rmi ralph
