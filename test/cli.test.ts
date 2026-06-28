import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { describe, it } from "node:test";
import { promisify } from "node:util";

const run = promisify(execFile);

describe("cli", () => {
  it("renders json from fixture skills", async () => {
    const { stdout } = await run("node", ["dist/src/cli.js", "scan", "fixtures/skills", "--format", "json"]);
    const parsed = JSON.parse(stdout);
    assert.equal(parsed.summary.skillCount, 4);
    assert.ok(parsed.summary.warningCount > 0);
  });
});
