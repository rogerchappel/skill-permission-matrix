#!/usr/bin/env bash
set -euo pipefail

smoke_root="$(mktemp -d "${TMPDIR:-/tmp}/skill-permission-matrix-package-smoke.XXXXXX")"
trap 'rm -rf "$smoke_root"' EXIT

package_dir="$smoke_root/package"
consumer_dir="$smoke_root/consumer"
mkdir -p "$package_dir" "$consumer_dir"

pack_manifest="$smoke_root/pack-manifest.json"
npm pack --dry-run --json >"$pack_manifest"
node --input-type=module - "$pack_manifest" <<'NODE'
  import assert from "node:assert/strict";
  import { readFile } from "node:fs/promises";

  const [manifestPath] = process.argv.slice(2);
  const [{ files }] = JSON.parse(await readFile(manifestPath, "utf8"));
  const paths = files.map(({ path }) => path);
  for (const required of ["dist/src/cli.js", "dist/src/cli.d.ts", "dist/src/index.js", "dist/src/index.d.ts"]) {
    assert(paths.includes(required), `package must contain ${required}`);
  }
  assert(!paths.some((path) => path.startsWith("dist/test/")), "package must exclude compiled tests");
  assert(!paths.some((path) => path.includes("stale")), "package must exclude stale build artifacts");
  assert(
    paths.filter((path) => path.startsWith("dist/")).every((path) =>
      path.startsWith("dist/src/") && [".js", ".d.ts"].some((extension) => path.endsWith(extension))
    ),
    "package dist entries must be runtime JavaScript or declarations under dist/src",
  );
NODE

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
  mkdir -p fixture/example
  printf '%s\n' '---' 'name: example' 'description: package smoke fixture' '---' >fixture/example/SKILL.md
  ./node_modules/.bin/skill-permission-matrix scan fixture --format json | node --input-type=module -e '
    import assert from "node:assert/strict";
    let input = "";
    for await (const chunk of process.stdin) input += chunk;
    const result = JSON.parse(input);
    assert.equal(result.rows.length, 1);
  '
)
