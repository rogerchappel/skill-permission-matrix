# skill-permission-matrix

Review required tools, side effects, and approval boundaries across agent `SKILL.md` files.

## Quickstart

```bash
npm install
npm run build
node dist/cli.js scan fixtures/skills --format markdown
```

JSON output is available for release evidence or downstream checks:

```bash
node dist/cli.js scan fixtures/skills --format json --config fixtures/skill-permission-matrix.json
```

## CLI

```bash
skill-permission-matrix scan <dir> [--format markdown|json] [--config file] [--out file]
```

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

## Config

Create `skill-permission-matrix.json` when a project has a known tool set or preferred approval phrases.

```json
{
  "allowedTools": ["exec", "file_fetch", "web_fetch"],
  "approvalPhrases": ["explicit approval", "reviewer confirmation"]
}
```

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
- Unusual skill templates may need config tuning.
- Source-code permission analysis is out of scope for V1.
