# Ralph Loop Commands

# Build the docker image
build:
    docker build -t ralph .

# Run loop mode (all tickets until done)
loop *args:
    docker run -it \
        -v $(pwd):/workspace \
        -v ~/.claude:/root/.claude:ro \
        ralph /ralph/ralph-loop.sh {{args}}

# Run once mode (one ticket, then stop)
once:
    docker run -it \
        -v $(pwd):/workspace \
        -v ~/.claude:/root/.claude:ro \
        ralph /ralph/ralph-once.sh

# Show remaining tickets
tickets:
    jq '.tickets[] | select(.passes == false) | {id, title, priority}' tickets.json

# Show completed tickets
done:
    jq '.tickets[] | select(.passes == true) | {id, title}' tickets.json

# Add a new ticket (interactive)
add title priority="10":
    @echo '{"id": '$(jq '[.tickets[].id] | max + 1' tickets.json)', "title": "{{title}}", "description": "", "passes": false, "priority": {{priority}}}' | \
        jq -s '.[0].tickets += [.[1]] | .[0]' tickets.json - > tickets.json.tmp && \
        mv tickets.json.tmp tickets.json
    @echo "Added ticket: {{title}}"

# Show progress log
progress:
    cat progress.txt

# Clean docker image
clean:
    docker rmi ralph
