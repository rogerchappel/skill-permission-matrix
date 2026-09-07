# Release Candidate Notes

## 0.1.0

Classification: ship

Verification planned for every release-candidate PR:

- `npm run check`
- `npm test`
- `npm run build`
- `npm run smoke`
- `npm run package:smoke`
- `npm run docs:smoke`
- CLI fixture smoke with Markdown and JSON output

Publication status: the package is not yet available from the npm registry.
Release candidates are installed from a locally generated `npm pack` tarball.

Known limits:

- Extraction is deterministic and advisory, not a full natural-language permission proof.
- Custom skill templates may need config phrases to avoid false positives.
