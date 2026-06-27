import { readFile } from "node:fs/promises";

import type { MatrixConfig } from "./types.js";

export const defaultConfig: MatrixConfig = {
  allowedTools: [
    "apply_patch",
    "browser",
    "exec",
    "file_fetch",
    "file_write",
    "image",
    "message",
    "pdf",
    "web_fetch",
    "web_search"
  ],
  approvalPhrases: [
    "approval",
    "explicitly asks",
    "explicit approval",
    "reviewer confirmation",
    "requires approval"
  ]
};

export async function loadConfig(path?: string): Promise<MatrixConfig> {
  if (!path) return defaultConfig;
  const parsed = JSON.parse(await readFile(path, "utf8")) as Partial<MatrixConfig>;
  return {
    allowedTools: parsed.allowedTools ?? defaultConfig.allowedTools,
    approvalPhrases: parsed.approvalPhrases ?? defaultConfig.approvalPhrases
  };
}
