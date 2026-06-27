# Skill Permission Matrix

Use this skill when reviewing one or more agent `SKILL.md` files for tool requirements, side-effect boundaries, approval requirements, and validation commands.

## Required Inputs

- A local directory containing one or more `SKILL.md` files.
- Optional `skill-permission-matrix.json` config with `allowedTools` and `approvalPhrases`.

## Side-effect Boundaries

- Reads local skill files and an optional config file.
- Writes only when the caller redirects output or uses shell redirection.
- Does not install, apply, approve, publish, or edit skills.
- Does not call external services.

## Approval Requirements

No approval is needed for local scans. Any decision to install, publish, or grant a skill new external action permissions remains outside this skill and requires the reviewer's normal approval workflow.

## Examples

```bash
skill-permission-matrix scan ./skills --format markdown
skill-permission-matrix scan ./skills --config skill-permission-matrix.json --format json
```

## Validation

Run `npm run smoke` in this repository to scan fixture skills and confirm warnings are produced for incomplete or broad-permission examples.
