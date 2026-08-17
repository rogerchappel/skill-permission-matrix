# Approved Social Posting

Use this skill to prepare reviewed social replies before any public action runs.

## Required Inputs

- Target post URL.
- Reviewed reply draft.
- Account owner approval phrase.

## Required Tools

- `web_fetch`
- `message`

## Side-effect Boundaries

- May publish a public reply only after explicit approval.
- May post from an authenticated social account only after reviewer confirmation.
- Does not publish drafts, delete content, or update account settings without
  explicit approval.
- Uses external web evidence only to verify the target conversation.

## Approval Requirements

Public posting requires explicit approval with the exact owner phrase.

## Validation

```bash
skill-permission-matrix scan fixtures/skills --format markdown
```
