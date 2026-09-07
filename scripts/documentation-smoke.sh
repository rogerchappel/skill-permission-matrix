#!/usr/bin/env bash
set -euo pipefail

smoke_root="$(mktemp -d "${TMPDIR:-/tmp}/skill-permission-matrix-docs-smoke.XXXXXX")"
trap 'rm -rf "$smoke_root"' EXIT

node --input-type=module <<'NODE'
  import assert from "node:assert/strict";
  import { readFile } from "node:fs/promises";

  const readme = await readFile("README.md", "utf8");
  assert.match(readme, /not published to the npm registry yet/);
  assert.match(readme, /npm pack/);
  assert.match(readme, /npm install \.\.\/skill-permission-matrix\/skill-permission-matrix-0\.1\.0\.tgz/);
  assert.match(readme, /npx skill-permission-matrix --help/);
  assert.match(readme, /import \{ scanSkills \} from "skill-permission-matrix"/);
NODE

package_dir="$smoke_root/package"
consumer_dir="$smoke_root/consumer"
mkdir -p "$package_dir" "$consumer_dir"
npm pack --json --pack-destination "$package_dir" >"$smoke_root/pack.json"
tarball_name="$(node --input-type=module - "$smoke_root/pack.json" <<'NODE'
  import { readFile } from "node:fs/promises";
  const [manifestPath] = process.argv.slice(2);
  const [{ filename }] = JSON.parse(await readFile(manifestPath, "utf8"));
  process.stdout.write(filename);
NODE
)"

(
  cd "$consumer_dir"
  npm init --yes >/dev/null
  npm install --ignore-scripts --no-audit --no-fund "$package_dir/$tarball_name" >/dev/null
  ./node_modules/.bin/skill-permission-matrix --help >/dev/null
  node --input-type=module -e '
    import assert from "node:assert/strict";
    const { scanSkills } = await import("skill-permission-matrix");
    assert.equal(typeof scanSkills, "function");
  '
)
