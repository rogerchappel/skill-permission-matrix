#!/usr/bin/env bash
set -euo pipefail

npm run check
npm test
npm run build
npm run smoke
node dist/src/cli.js scan fixtures/skills --format json --config fixtures/skill-permission-matrix.json >/tmp/skill-permission-matrix-smoke.json
