#!/usr/bin/env bash
set -e

echo "=== Ralph Once ==="
echo "Working on one ticket, then stopping."

cd /workspace

# Run claude for one ticket
claude --print "$(cat /ralph/prompt.md)" \
  --dangerously-skip-permissions \
  --allowedTools "Bash,Read,Write,Edit,Glob,Grep,WebSearch,WebFetch,Task"

# Checkpoint
git add -A && git commit -m "ralph-once $(date +%H:%M)" || true

echo "=== Ralph Once Complete ==="
