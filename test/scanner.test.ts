import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { loadConfig, renderJson, renderMarkdown, scanSkills } from "../src/index.js";

const fixtureRoot = new URL("fixtures/skills", `file://${process.cwd()}/`).pathname;
const configPath = new URL("fixtures/skill-permission-matrix.json", `file://${process.cwd()}/`).pathname;

describe("scanSkills", () => {
  it("discovers skills and extracts permission fields", async () => {
    const result = await scanSkills(fixtureRoot);
    assert.equal(result.summary.skillCount, 4);
    const draft = result.rows.find((row) => row.name === "Draft Only Follow-up");
    assert.ok(draft);
    assert.deepEqual(draft.tools, ["exec"]);
    assert.ok(draft.approvalRequirements.some((line) => line.includes("explicit approval")));
  });

  it("flags incomplete and broad permission language", async () => {
    const result = await scanSkills(fixtureRoot);
    const incomplete = result.rows.find((row) => row.name === "Incomplete Skill");
    assert.ok(incomplete);
    assert.ok(incomplete.warnings.includes("missing side-effect boundary section"));
    assert.ok(incomplete.warnings.includes("missing approval requirement"));
    assert.ok(incomplete.warnings.includes("broad filesystem write language"));
    assert.ok(incomplete.warnings.includes("broad network language"));
  });

  it("uses config to validate allowed tools", async () => {
    const config = await loadConfig(configPath);
    const result = await scanSkills(fixtureRoot, { config });
    const incomplete = result.rows.find((row) => row.name === "Incomplete Skill");
    assert.ok(incomplete?.warnings.includes("unknown tool: unknown_connector"));
  });
});

describe("renderers", () => {
  it("renders deterministic markdown", async () => {
    const result = await scanSkills(fixtureRoot);
    const markdown = renderMarkdown(result);
    assert.match(markdown, /# Skill Permission Matrix/);
    assert.match(markdown, /Incomplete Skill/);
    assert.match(markdown, /Warnings:/);
  });

  it("renders parseable json", async () => {
    const result = await scanSkills(fixtureRoot);
    const parsed = JSON.parse(renderJson(result));
    assert.equal(parsed.summary.skillCount, 4);
  });
});
