# Project Instructions

This is a Ralph Loop project. The agent runs in iterations, completing one ticket at a time.

## Workflow

1. Check `tickets.json` for the highest priority incomplete ticket
2. Complete the ticket
3. Verify with tests/type checks if applicable
4. Mark ticket as `passes: true` in tickets.json
5. Append summary to progress.txt
6. Exit (loop handles next iteration)

## Ticket Format

```json
{
  "id": 1,
  "title": "Short title",
  "description": "Detailed description of what to do",
  "passes": false,
  "priority": 1
}
```

- Lower priority number = higher priority (do first)
- Set `passes: true` only after verified complete

## Progress Log

Append to progress.txt after each ticket:
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
