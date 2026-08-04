import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

  it("renders markdown and writes output with documented options", async () => {
    const directory = await mkdtemp(join(tmpdir(), "skill-permission-matrix-cli-"));
    const outputPath = join(directory, "report.md");
    try {
      const { stdout } = await run("node", ["dist/src/cli.js", "scan", "fixtures/skills", "--format", "markdown", "--config", "fixtures/skill-permission-matrix.json", "--out", outputPath]);
      assert.equal(stdout, "");
      assert.match(await readFile(outputPath, "utf8"), /^# Skill Permission Matrix/m);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  for (const [name, cliArgs, diagnostic] of [
    ["unknown flags", ["--formt", "json"], "Unknown option: --formt"],
    ["missing --format values", ["--format"], "Missing value for --format"],
    ["missing --config values", ["--config"], "Missing value for --config"],
    ["missing --out values", ["--out"], "Missing value for --out"],
    ["duplicate options", ["--out", "one.md", "--out", "two.md"], "Option specified more than once: --out"],
    ["conflicting formats", ["--format", "json", "--format", "markdown"], "Option specified more than once: --format"],
  ] as const) {
    it(`rejects ${name} with usage exit`, async () => {
      await assert.rejects(run("node", ["dist/src/cli.js", "scan", "fixtures/skills", ...cliArgs]), (error: unknown) => {
        const failure = error as { code: number; stderr: string; stdout: string };
        assert.equal(failure.code, 2);
        assert.equal(failure.stdout, "");
        assert.ok(failure.stderr.startsWith(`${diagnostic}\nUsage:`));
        return true;
      });
    });
  }
});
