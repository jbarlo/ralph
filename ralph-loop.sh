#!/usr/bin/env bash
set -e

MAX_ITERATIONS=${1:-20}
echo "=== Ralph Loop (max $MAX_ITERATIONS iterations) ==="

cd /workspace

for i in $(seq 1 $MAX_ITERATIONS); do
  echo ""
  echo "=== Iteration $i/$MAX_ITERATIONS ==="

  # Check if all tickets done
  if jq -e '[.tickets[] | select(.passes == false)] | length == 0' tickets.json > /dev/null 2>&1; then
    echo "All tickets complete!"
    exit 0
  fi

  # Show remaining tickets
  REMAINING=$(jq '[.tickets[] | select(.passes == false)] | length' tickets.json)
  echo "Remaining tickets: $REMAINING"

  # Run claude
  claude --print "$(cat /ralph/prompt.md)" \
    --dangerously-skip-permissions \
    --allowedTools "Bash,Read,Write,Edit,Glob,Grep"

  # Checkpoint
  git add -A && git commit -m "ralph iteration $i" || true
done

echo ""
echo "=== Max iterations ($MAX_ITERATIONS) reached ==="
echo "Some tickets may still be incomplete."
