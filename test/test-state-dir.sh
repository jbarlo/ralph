#!/usr/bin/env bash
set -e

# Integration tests for .ralph/ state directory resolution and migration

SCRIPT_PATH="${BASH_SOURCE[0]}"
while [ -L "$SCRIPT_PATH" ]; do
  SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
  SCRIPT_PATH="$(readlink "$SCRIPT_PATH")"
  [[ "$SCRIPT_PATH" != /* ]] && SCRIPT_PATH="$SCRIPT_DIR/$SCRIPT_PATH"
done
TEST_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
RALPH_DIR="$(cd "$TEST_DIR/.." && pwd)"

RESULTS_FILE=$(mktemp)
echo "0 0" > "$RESULTS_FILE"

record_result() {
  local pass_inc="$1" fail_inc="$2"
  read -r p f < "$RESULTS_FILE"
  echo "$((p + pass_inc)) $((f + fail_inc))" > "$RESULTS_FILE"
}

assert_eq() {
  local desc="$1" expected="$2" actual="$3"
  if [[ "$expected" == "$actual" ]]; then
    echo "  PASS: $desc"
    record_result 1 0
  else
    echo "  FAIL: $desc"
    echo "    expected: $expected"
    echo "    actual:   $actual"
    record_result 0 1
  fi
}

assert_file_exists() {
  local desc="$1" path="$2"
  if [[ -e "$path" ]]; then
    echo "  PASS: $desc"
    record_result 1 0
  else
    echo "  FAIL: $desc (file not found: $path)"
    record_result 0 1
  fi
}

assert_file_not_exists() {
  local desc="$1" path="$2"
  if [[ ! -e "$path" ]]; then
    echo "  PASS: $desc"
    record_result 1 0
  else
    echo "  FAIL: $desc (file exists but shouldn't: $path)"
    record_result 0 1
  fi
}

# Create temp workspace
TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

# --- Test 1: State resolution prefers .ralph/ ---
echo "Test 1: State resolution prefers .ralph/"
(
  cd "$TMPDIR"
  mkdir -p .ralph
  echo '{"tickets":[]}' > .ralph/tickets.json
  echo "progress" > .ralph/progress.txt
  mkdir -p .ralph/hooks.d/on-start

  source "$RALPH_DIR/lib/ralph-state.sh"
  assert_eq "RALPH_TICKETS points to .ralph/" ".ralph/tickets.json" "$RALPH_TICKETS"
  assert_eq "RALPH_PROGRESS points to .ralph/" ".ralph/progress.txt" "$RALPH_PROGRESS"
  assert_eq "RALPH_HOOKS_DIR points to .ralph/" ".ralph/hooks.d" "$RALPH_HOOKS_DIR"
)

# --- Test 2: State resolution falls back to root ---
echo "Test 2: State resolution falls back to root"
(
  TMPDIR2=$(mktemp -d)
  cd "$TMPDIR2"
  echo '{"tickets":[]}' > tickets.json
  echo "progress" > progress.txt
  mkdir -p hooks.d/on-start

  source "$RALPH_DIR/lib/ralph-state.sh"
  assert_eq "RALPH_TICKETS falls back to root" "tickets.json" "$RALPH_TICKETS"
  assert_eq "RALPH_PROGRESS falls back to root" "progress.txt" "$RALPH_PROGRESS"
  assert_eq "RALPH_HOOKS_DIR falls back to root" "hooks.d" "$RALPH_HOOKS_DIR"
  rm -rf "$TMPDIR2"
)

# --- Test 3: Migration moves files ---
echo "Test 3: Migration moves root files to .ralph/"
(
  TMPDIR3=$(mktemp -d)
  cd "$TMPDIR3"
  echo '{"tickets":[{"id":1}]}' > tickets.json
  echo "# Progress" > progress.txt
  mkdir -p hooks.d/on-start hooks.d/on-complete hooks.d/on-error
  touch hooks.d/on-start/.gitkeep

  "$RALPH_DIR/bin/ralph-migrate"

  assert_file_exists "tickets.json moved to .ralph/" ".ralph/tickets.json"
  assert_file_not_exists "tickets.json removed from root" "tickets.json"
  assert_file_exists "progress.txt moved to .ralph/" ".ralph/progress.txt"
  assert_file_not_exists "progress.txt removed from root" "progress.txt"
  assert_file_exists "hooks.d moved to .ralph/" ".ralph/hooks.d/on-start/.gitkeep"
  assert_file_not_exists "hooks.d removed from root" "hooks.d"

  # Verify content preserved
  TICKET_COUNT=$(jq '.tickets | length' .ralph/tickets.json)
  assert_eq "ticket data preserved" "1" "$TICKET_COUNT"

  rm -rf "$TMPDIR3"
)

# --- Test 4: Migration skips when already migrated ---
echo "Test 4: Migration skips when .ralph/ already has files"
(
  TMPDIR4=$(mktemp -d)
  cd "$TMPDIR4"
  mkdir -p .ralph
  echo '{"tickets":[{"id":99}]}' > .ralph/tickets.json
  echo '{"tickets":[{"id":1}]}' > tickets.json

  OUTPUT=$("$RALPH_DIR/bin/ralph-migrate" 2>&1)
  assert_eq "warns about conflict" "1" "$(echo "$OUTPUT" | grep -c 'Warning.*both.*tickets.json')"

  # Root file should still exist (not moved)
  assert_file_exists "root tickets.json preserved" "tickets.json"
  # .ralph file should still have original content
  ID=$(jq '.tickets[0].id' .ralph/tickets.json)
  assert_eq ".ralph/tickets.json not overwritten" "99" "$ID"

  rm -rf "$TMPDIR4"
)

# --- Test 5: ralph-init creates .ralph/ structure ---
echo "Test 5: ralph-init creates .ralph/ structure"
(
  TMPDIR5=$(mktemp -d)
  cd "$TMPDIR5"
  git init -q .

  "$RALPH_DIR/bin/ralph-init"

  assert_file_exists ".ralph dir created" ".ralph"
  assert_file_exists ".ralph/tickets.json created" ".ralph/tickets.json"
  assert_file_exists ".ralph/progress.txt created" ".ralph/progress.txt"
  assert_file_exists ".ralph/hooks.d/on-start created" ".ralph/hooks.d/on-start"
  assert_file_exists ".ralph/hooks.d/on-complete created" ".ralph/hooks.d/on-complete"
  assert_file_exists ".ralph/hooks.d/on-error created" ".ralph/hooks.d/on-error"

  rm -rf "$TMPDIR5"
)

# --- Test 6: ralph-add works with .ralph/ ---
echo "Test 6: ralph-add works with .ralph/"
(
  TMPDIR6=$(mktemp -d)
  cd "$TMPDIR6"
  mkdir -p .ralph
  echo '{"tickets": []}' > .ralph/tickets.json

  "$RALPH_DIR/bin/ralph-add" "Test ticket" 5 "Test description"

  TICKET_TITLE=$(jq -r '.tickets[0].title' .ralph/tickets.json)
  assert_eq "ticket added to .ralph/tickets.json" "Test ticket" "$TICKET_TITLE"

  rm -rf "$TMPDIR6"
)

# --- Test 7: ralph-tickets works with .ralph/ ---
echo "Test 7: ralph-tickets works with .ralph/"
(
  TMPDIR7=$(mktemp -d)
  cd "$TMPDIR7"
  mkdir -p .ralph
  echo '{"tickets": [{"id":1,"title":"Test","status":"pending","priority":1,"description":""}]}' > .ralph/tickets.json

  OUTPUT=$("$RALPH_DIR/bin/ralph-tickets" pending)
  assert_eq "shows tickets from .ralph/" "1" "$(echo "$OUTPUT" | grep -c 'Test')"

  rm -rf "$TMPDIR7"
)

# --- Test 8: ralph-tickets falls back to root ---
echo "Test 8: ralph-tickets falls back to root"
(
  TMPDIR8=$(mktemp -d)
  cd "$TMPDIR8"
  echo '{"tickets": [{"id":1,"title":"RootTest","status":"pending","priority":1,"description":""}]}' > tickets.json

  OUTPUT=$("$RALPH_DIR/bin/ralph-tickets" pending)
  assert_eq "shows tickets from root fallback" "1" "$(echo "$OUTPUT" | grep -c 'RootTest')"

  rm -rf "$TMPDIR8"
)

# --- Test 9: Re-resolve after migration ---
echo "Test 9: ralph_resolve_state re-resolves after migration"
(
  TMPDIR9=$(mktemp -d)
  cd "$TMPDIR9"
  echo '{"tickets":[]}' > tickets.json

  source "$RALPH_DIR/lib/ralph-state.sh"
  assert_eq "initially resolves to root" "tickets.json" "$RALPH_TICKETS"

  mkdir -p .ralph
  mv tickets.json .ralph/tickets.json
  ralph_resolve_state
  assert_eq "re-resolves to .ralph/ after migration" ".ralph/tickets.json" "$RALPH_TICKETS"

  rm -rf "$TMPDIR9"
)

echo ""
echo "=== Results ==="
read -r PASS FAIL < "$RESULTS_FILE"
rm -f "$RESULTS_FILE"
echo "Passed: $PASS"
echo "Failed: $FAIL"

if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
