# Read Only Research

Use this skill to inspect local documentation and summarize findings.

## Required Inputs

- A local documentation directory.

## Required Tools

- `exec`
- `file_fetch`

## Side-effect Boundaries

- Reads local files only.
- Does not write files.
- Does not call external services.

## Approval Requirements

No approval is needed for read-only local inspection.

## Validation

```bash
npm run check
```
