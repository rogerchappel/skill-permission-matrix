import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { loadConfig } from "../src/index.js";

describe("loadConfig", () => {
  it("fills omitted fields from the defaults", async () => {
    await withConfig({ allowedTools: ["exec"] }, async (path) => {
      const config = await loadConfig(path);
      assert.deepEqual(config.allowedTools, ["exec"]);
      assert.ok(config.approvalPhrases.includes("explicit approval"));
    });
  });

  for (const [name, value, message] of [
    ["null top-level value", null, "Config must be a JSON object"],
    ["scalar top-level value", "invalid", "Config must be a JSON object"],
    ["array top-level value", [], "Config must be a JSON object"],
    ["object allowedTools", { allowedTools: {} }, "Config field allowedTools must be an array of strings"],
    ["scalar approvalPhrases", { approvalPhrases: "approval" }, "Config field approvalPhrases must be an array of strings"],
    ["non-string allowedTools member", { allowedTools: ["exec", 42] }, "Config field allowedTools must be an array of strings"],
    ["non-string approvalPhrases member", { approvalPhrases: [null] }, "Config field approvalPhrases must be an array of strings"]
  ] as const) {
    it(`rejects a ${name}`, async () => {
      await withConfig(value, async (path) => {
        await assert.rejects(loadConfig(path), new Error(message));
      });
    });
  }
});

async function withConfig(value: unknown, test: (path: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), "permission-matrix-config-"));
  try {
    const path = join(root, "config.json");
    await writeFile(path, JSON.stringify(value));
    await test(path);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
