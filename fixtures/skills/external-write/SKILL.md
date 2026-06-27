# External Write Connector

Use this skill to prepare and perform approved connector updates.

## Required Inputs

- Connector target.
- Proposed payload.

## Required Tools

- `message`
- `web_fetch`

## Side-effect Boundaries

- May update external CRM records after reviewer confirmation.
- May post to approved project-management APIs after reviewer confirmation.
- Does not delete records.

## Approval Requirements

External writes require explicit approval before execution.

## Validation

```bash
connector-impact preview fixtures/crm-update.yaml
```
