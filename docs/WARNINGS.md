# Warning Semantics

Warnings are deterministic review prompts. They do not prove a skill is unsafe.

## Missing approval requirement

Raised when no configured approval phrase appears in the skill. This is expected for some read-only skills, but reviewers should still confirm that read-only scope is explicit.

## Live-action language without approval requirement

Raised when verbs such as send, post, publish, delete, update, create, merge, approve, install, deploy, charge, email, or notify appear without approval language. When one statement contains multiple action kinds, including comma-separated or coordinated `and`/`or` lists, every action kind must have a matching scoped approval requirement; approval for one action does not authorize the others.

## Missing side-effect boundary section

Raised when the skill does not contain a side-effect boundary heading. Public skills should state what they read, write, call, or refuse to do.

## Broad filesystem or network language

Raised when write or network claims include broad terms such as any, all, every, unrestricted, or full access.

## Unknown tool

Raised when a declared tool is not in the configured allowed tool list.
