#!/usr/bin/env bash
# Resolves ralph state file paths.
# Source this file; it exports RALPH_TICKETS, RALPH_PROGRESS, RALPH_HOOKS_DIR.
# Prefers .ralph/ directory, falls back to root-level paths.

ralph_resolve_state() {
  if [[ -d ".ralph" ]]; then
    RALPH_TICKETS=".ralph/tickets.json"
    RALPH_PROGRESS=".ralph/progress.txt"
    RALPH_HOOKS_DIR=".ralph/hooks.d"
  else
    RALPH_TICKETS="tickets.json"
    RALPH_PROGRESS="progress.txt"
    RALPH_HOOKS_DIR="hooks.d"
  fi
  export RALPH_TICKETS RALPH_PROGRESS RALPH_HOOKS_DIR
}

ralph_resolve_state
