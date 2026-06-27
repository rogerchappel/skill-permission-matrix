# Draft Only Follow-up

Use this skill to draft follow-up text without sending it.

## Required Inputs

- Meeting notes.
- Recipient context.

## Required Tools

- `exec`

## Side-effect Boundaries

- Writes draft files only when the user asks for a local artifact.
- Does not send email, chat messages, or connector updates.

## Approval Requirements

Sending or posting a draft requires explicit approval and is outside this skill.

## Validation

```bash
npm run smoke
```
