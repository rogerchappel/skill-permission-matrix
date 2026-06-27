# Orchestration

Use Skill Permission Matrix before publishing, installing, or reviewing a bundle of agent skills.

1. Run `skill-permission-matrix scan <skill-root> --format markdown`.
2. Review warnings for missing approval language, missing side-effect boundaries, unknown tools, broad filesystem access, or broad network claims.
3. Run again with a project config when your team has expected approval phrases or allowed tools.
4. Attach the Markdown output to review notes or store the JSON output with release evidence.

The tool is read-only. It never installs skills, edits skill files, calls external APIs, or approves side effects.
