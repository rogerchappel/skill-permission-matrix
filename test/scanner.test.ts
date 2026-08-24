import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { loadConfig, renderJson, renderMarkdown, scanSkills } from "../src/index.js";

const fixtureRoot = new URL("fixtures/skills", `file://${process.cwd()}/`).pathname;
const configPath = new URL("fixtures/skill-permission-matrix.json", `file://${process.cwd()}/`).pathname;
const actionScopeRoot = new URL("test/fixtures/action-scope", `file://${process.cwd()}/`).pathname;

describe("scanSkills", () => {
  it("discovers skills and extracts permission fields", async () => {
    const result = await scanSkills(fixtureRoot);
    assert.equal(result.summary.skillCount, 5);
    const draft = result.rows.find((row) => row.name === "Draft Only Follow-up");
    assert.ok(draft);
    assert.deepEqual(draft.tools, ["exec"]);
    assert.ok(draft.approvalRequirements.some((line) => line.includes("explicit approval")));
    assert.ok(!draft.warnings.includes("live-action language without approval requirement"));
    const externalWrite = result.rows.find((row) => row.name === "External Write Connector");
    assert.ok(externalWrite);
    assert.ok(!externalWrite.warnings.includes("live-action language without approval requirement"));
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

  it("extracts tools only from explicit declarations", async () => {
    const root = await mkdtemp(join(tmpdir(), "permission-matrix-tools-"));
    try {
      await writeFile(join(root, "SKILL.md"), `# Tool declarations

Use \`config.json\` with the value \`production\`.

Tools: exec, \`web_fetch\`

## Required Tools

- \`file_fetch\`
- message

## Validation

Run \`npm\` tests against \`fixture.yaml\`.
`);
      const result = await scanSkills(root, {
        config: {
          allowedTools: ["exec", "web_fetch", "file_fetch", "message"],
          approvalPhrases: []
        }
      });
      const [row] = result.rows;
      assert.deepEqual(row.tools, ["exec", "web_fetch", "file_fetch", "message"]);
      assert.ok(!row.warnings.some((warning) => warning.startsWith("unknown tool:")));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not treat negated approval statements as requirements", async () => {
    const negatedForms = [
      "No approval is required.",
      "Approval is not required.",
      "This action does not require explicit approval.",
      "Updates may proceed without reviewer confirmation."
    ];

    for (const statement of negatedForms) {
      const root = await mkdtemp(join(tmpdir(), "permission-matrix-negation-"));
      try {
        await writeFile(join(root, "SKILL.md"), `# Unsafe action\n\nMay delete every file.\n\n## Side-effect Boundaries\n\nBoundaries are documented here.\n\n## Approval Requirements\n\n${statement}\n`);
        const result = await scanSkills(root);
        const [row] = result.rows;
        assert.deepEqual(row.approvalRequirements, [], statement);
        assert.ok(row.warnings.includes("missing approval requirement"), statement);
        assert.ok(row.warnings.includes("live-action language without approval requirement"), statement);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    }
  });

  it("keeps approval requirements expressed with negative action wording", async () => {
    const root = await mkdtemp(join(tmpdir(), "permission-matrix-requirement-"));
    try {
      await writeFile(join(root, "SKILL.md"), "# Guarded action\n\nMay post an update.\n\n## Side-effect Boundaries\n\nDo not post without explicit approval.\n");
      const result = await scanSkills(root);
      const [row] = result.rows;
      assert.deepEqual(row.approvalRequirements, ["Do not post without explicit approval."]);
      assert.ok(!row.warnings.includes("missing approval requirement"));
      assert.ok(!row.warnings.includes("live-action language without approval requirement"));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not let an unrelated approval suppress a live-action warning", async () => {
    const result = await scanSkills(join(actionScopeRoot, "unrelated-approval"));
    const [row] = result.rows;
    assert.deepEqual(row.approvalRequirements, ["Delete files only after explicit approval."]);
    assert.ok(row.warnings.includes("live-action language without approval requirement"));
  });

  it("warns when only one of multiple live actions has approval", async () => {
    const result = await scanSkills(join(actionScopeRoot, "multiple-actions"));
    const [row] = result.rows;
    assert.ok(row.warnings.includes("live-action language without approval requirement"));
  });

  it("accepts multiple live actions with correctly scoped approvals", async () => {
    const result = await scanSkills(join(actionScopeRoot, "scoped-approvals"));
    const [row] = result.rows;
    assert.ok(!row.warnings.includes("live-action language without approval requirement"));
  });

  it("warns when a coordinated and-action is only partially approved", async () => {
    const result = await scanSkills(join(actionScopeRoot, "coordinated-and-partial"));
    const [row] = result.rows;
    assert.ok(row.warnings.includes("live-action language without approval requirement"));
  });

  it("warns when a coordinated or-action is only partially approved", async () => {
    const result = await scanSkills(join(actionScopeRoot, "coordinated-or-partial"));
    const [row] = result.rows;
    assert.ok(row.warnings.includes("live-action language without approval requirement"));
  });

  it("accepts coordinated live actions when every kind is approved", async () => {
    const result = await scanSkills(join(actionScopeRoot, "coordinated-fully-approved"));
    const [row] = result.rows;
    assert.ok(!row.warnings.includes("live-action language without approval requirement"));
  });

  it("warns when a comma-separated action list is only partially approved", async () => {
    const result = await scanSkills(join(actionScopeRoot, "comma-separated-partial"));
    const [row] = result.rows;
    assert.ok(row.externalActions.includes("May delete files, deploy releases"));
    assert.ok(row.warnings.includes("live-action language without approval requirement"));
  });

  it("accepts a comma-separated action list when every kind is approved", async () => {
    const result = await scanSkills(join(actionScopeRoot, "comma-separated-fully-approved"));
    const [row] = result.rows;
    assert.ok(!row.warnings.includes("live-action language without approval requirement"));
  });

  it("keeps a live action after a semicolon-scoped prohibition", async () => {
    const root = await mkdtemp(join(tmpdir(), "permission-matrix-statement-scope-"));
    try {
      await writeFile(join(root, "SKILL.md"), "# Mixed actions\n\nNever send email; delete production files immediately.\n\n## Side-effect Boundaries\n\nApproval is required before sending email.\n");
      const result = await scanSkills(root);
      const [row] = result.rows;
      assert.ok(row.externalActions.includes("delete production files immediately"));
      assert.ok(!row.externalActions.some((action) => action.includes("Never send email")));
      assert.ok(row.warnings.includes("live-action language without approval requirement"));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("keeps a live action after a contrasting conjunction", async () => {
    const root = await mkdtemp(join(tmpdir(), "permission-matrix-conjunction-scope-"));
    try {
      await writeFile(join(root, "SKILL.md"), "# Contrasting actions\n\nNever send email, but delete production files after explicit approval.\n\n## Side-effect Boundaries\n\nDelete production files only after explicit approval.\n");
      const result = await scanSkills(root);
      const [row] = result.rows;
      assert.ok(row.externalActions.includes("delete production files after explicit approval"));
      assert.ok(!row.externalActions.some((action) => action.includes("Never send email")));
      assert.ok(!row.warnings.includes("live-action language without approval requirement"));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("keeps a coordinated multi-action prohibition fully negated", async () => {
    const root = await mkdtemp(join(tmpdir(), "permission-matrix-coordinated-negation-"));
    try {
      await writeFile(join(root, "SKILL.md"), "# Prohibited actions\n\nNever send email or delete production files.\n\n## Side-effect Boundaries\n\nThese actions are prohibited.\n");
      const result = await scanSkills(root);
      const [row] = result.rows;
      assert.deepEqual(row.externalActions, []);
      assert.ok(!row.warnings.includes("live-action language without approval requirement"));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("accepts explicitly approved social posting boundaries", async () => {
    const result = await scanSkills(fixtureRoot);
    const social = result.rows.find((row) => row.name === "Approved Social Posting");
    assert.ok(social);
    assert.deepEqual(social.tools, ["web_fetch", "message"]);
    assert.ok(social.externalActions.some((line) => line.includes("publish a public reply")));
    assert.ok(social.networkClaims.some((line) => line.includes("external web evidence")));
    assert.ok(social.approvalRequirements.some((line) => line.includes("requires explicit approval")));
    assert.deepEqual(social.warnings, []);
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
    assert.equal(parsed.summary.skillCount, 5);
  });
});
