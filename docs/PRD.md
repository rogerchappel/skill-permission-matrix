# Skill Permission Matrix PRD

## One-liner

Skill Permission Matrix extracts required tools, filesystem writes, network use, and approval boundaries from `SKILL.md` files into a compact review table.

## Problem

Reusable agent skills describe side effects in prose. Reviewers need a fast local way to compare permissions across skills and catch missing approval language before installing or publishing a skill bundle.

## Users

- Agent builders packaging public skills.
- Maintainers reviewing skill PRs.
- Agents selecting the least-privilege skill for a task.

## V1 Scope

- Local-first TypeScript CLI and library.
- `skill-permission-matrix scan <dir>` finds `SKILL.md` files and emits Markdown or JSON.
- Extract declared tools, inputs, external actions, filesystem write claims, network claims, approval requirements, and validation commands.
- Flag missing approval, missing side-effect boundary, live-action verbs without approval, and broad filesystem or network language.
- Support a small config file for allowed tools and expected approval phrases.
- Include fixtures for read-only, draft-only, external-write, and incomplete skills.

## Non-goals

- Static analysis of arbitrary source code.
- Installing skills.
- Enforcing runtime sandbox policy.

## Safety

- Reads local files only.
- Does not apply, install, or modify skill bundles.
- Treats extraction as advisory and requires reviewer confirmation for publication decisions.
