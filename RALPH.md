# Project Instructions

This is a Ralph Loop project. The agent runs in iterations, completing one ticket at a time.

## Workflow

1. Check `.ralph/tickets.json` for the highest priority incomplete ticket
2. Set its `status` to `"in_progress"`
3. Complete the ticket
4. Verify with tests/type checks if applicable
5. Set `status` to `"completed"` (or `"failed"` if unable)
6. Append summary to `.ralph/progress.txt`
7. Exit (loop handles next iteration)

## Ticket Format

```json
{
  "id": 1,
  "title": "Short title",
  "description": "Detailed description of what to do",
  "status": "pending",
  "priority": 1
}
```

Status values: `draft` | `pending` | `in_progress` | `completed` | `failed`. Ignore `draft` tickets — they're not ready for execution.

- Lower priority number = higher priority (do first)
- Set `status: "completed"` only after verified complete
- Dependencies described in ticket text are sufficient; ralph resolves order from descriptions

## Progress Log

Append to `.ralph/progress.txt` after each ticket:
```
## Ticket #1: Short title
- What was done
- Files changed
- Tests run
```

## Project-Specific Notes

Add your project-specific instructions here:
- Tech stack
- Testing commands
- Code conventions
- etc.

## Commits

Use conventional commits:
- `feat: ...` - new feature
- `fix: ...` - bug fix
- `refactor: ...` - code change (no new feature or fix)
- `docs: ...` - documentation only
- `test: ...` - adding/updating tests
- `chore: ...` - maintenance, deps, config
