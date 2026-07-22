#!/usr/bin/env bash
set -euo pipefail

smoke_root="$(mktemp -d "${TMPDIR:-/tmp}/skill-permission-matrix-package-smoke.XXXXXX")"
trap 'rm -rf "$smoke_root"' EXIT

package_dir="$smoke_root/package"
consumer_dir="$smoke_root/consumer"
mkdir -p "$package_dir" "$consumer_dir"

tarball_name="$(npm pack --silent --pack-destination "$package_dir")"

(
  cd "$consumer_dir"
  npm init --yes >/dev/null
  npm install --ignore-scripts --no-audit --no-fund "$package_dir/$tarball_name" >/dev/null
  node --input-type=module -e '
    import assert from "node:assert/strict";
    const library = await import("skill-permission-matrix");
    const expectedExports = ["loadConfig", "renderJson", "renderMarkdown", "scanSkills"];
    assert.deepEqual(Object.keys(library).sort(), expectedExports);
    for (const name of expectedExports) assert.equal(typeof library[name], "function", `${name} must be a function`);
  '
)
