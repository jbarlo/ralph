#!/usr/bin/env bash
set -e

if [[ -z "${RALPH_LOOP:-}" ]]; then
  echo "=== Ralph Once ==="
  echo "Working on one ticket, then stopping."
fi

cd /workspace

# Run claude for one ticket
claude --print "$(cat /ralph/prompt.md)" \
  --dangerously-skip-permissions \
  --allowedTools "Bash,Read,Write,Edit,Glob,Grep,WebSearch,WebFetch,Task"

# Checkpoint: commit any leftover changes ralph didn't commit itself
git add -A && git commit -m "chore: ralph checkpoint $(date +%H:%M)" || true

if [[ -z "${RALPH_LOOP:-}" ]]; then
  echo "=== Ralph Once Complete ==="
fi
