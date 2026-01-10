#!/usr/bin/env bash
set -e

echo "=== Ralph Once ==="
echo "Working on one ticket, then stopping."

cd /workspace

# Run claude for one ticket
claude --print "$(cat /ralph/prompt.md)" \
  --allowedTools "Bash,Read,Write,Edit,Glob,Grep"

# Checkpoint
git add -A && git commit -m "ralph-once $(date +%H:%M)" || true

echo "=== Ralph Once Complete ==="
