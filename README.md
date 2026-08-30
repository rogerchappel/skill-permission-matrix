# skill-permission-matrix

Review required tools, side effects, and approval boundaries across agent `SKILL.md` files.

## Quickstart

```bash
npm install
npm run build
node dist/src/cli.js scan fixtures/skills --format markdown
```

JSON output is available for release evidence or downstream checks:

```bash
node dist/src/cli.js scan fixtures/skills --format json --config fixtures/skill-permission-matrix.json
```

## CLI

```bash
skill-permission-matrix scan <dir> [--format markdown|json] [--config file] [--out file]
```

Invalid invocations (including unknown options, missing option values, and repeated
options) print a short diagnostic plus usage to standard error and exit with status
2. Runtime failures exit with status 1. Successful scans exit with status 0 and
write the selected format to standard output, or to the `--out` file when supplied.

## Library API

The package exports `loadConfig`, `renderJson`, `renderMarkdown`, and `scanSkills`:

```js
import { scanSkills } from "skill-permission-matrix";

const result = await scanSkills("fixtures/skills");
```

The scanner finds every `SKILL.md` under the target directory and reports:

- declared tools
- required inputs
- external action language
- filesystem write claims
- network claims
- approval requirement lines
- validation commands
- review warnings

Tools are extracted only from explicit declarations. Use a `Tools` or `Required Tools` heading with a plain or backticked list:

```markdown
## Required Tools

- `exec`
- file_fetch
```

For a compact declaration, use `Tools: exec, file_fetch` (or `Required Tools:`). Inline code elsewhere, including commands, filenames, and configuration values, is not treated as a tool declaration. `allowedTools` controls which extracted names produce an unknown-tool warning; it does not add declarations to a skill.

## Config

Create `skill-permission-matrix.json` when a project has a known tool set or preferred approval phrases.

```json
{
  "allowedTools": ["exec", "file_fetch", "web_fetch"],
  "approvalPhrases": ["explicit approval", "reviewer confirmation"]
}
```

The config must be a JSON object. Both fields are optional; omitted fields use the built-in defaults. When present, `allowedTools` and `approvalPhrases` must each be an array containing only strings. Invalid shapes exit nonzero with a field-specific diagnostic such as `Config field approvalPhrases must be an array of strings`.

## Safety Notes

This tool is local-first and read-only. It does not install, apply, approve, publish, or edit skills. It does not call external services. Treat warnings as review prompts, not as a runtime sandbox.

## Development

```bash
npm run check
npm test
npm run build
npm run smoke
npm run package:smoke
npm run release:check
```

## Limitations

- Extraction is deterministic text analysis, not a proof of runtime behavior.
- External actions are evaluated at sentence, semicolon, and contrasting/sequential conjunction boundaries. Approval coverage also respects comma scope: a comma-separated follow-on action needs its own approval language, so `Approval is required before publishing, delete files automatically` does not approve deletion. Coordinated actions joined by `and` or `or` remain in one statement, so compound requirements such as `Publishing and deleting require explicit approval` cover both actions. Common prohibitions—including `The skill does not publish or send`, `The skill will not send email`, and `Sending email is prohibited`—are excluded from live-action warnings, while a later affirmative action after a contrasting or sequential boundary is still checked. Every distinct live-action kind in a permitted statement still needs a matching approval requirement.
- Unusual skill templates may need config tuning.
- Source-code permission analysis is out of scope for V1.
