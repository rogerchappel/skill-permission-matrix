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
  const parsed: unknown = JSON.parse(await readFile(path, "utf8"));
  if (!isRecord(parsed)) throw new Error("Config must be a JSON object");
  validateStringArray(parsed, "allowedTools");
  validateStringArray(parsed, "approvalPhrases");
  return {
    allowedTools: (parsed.allowedTools as string[] | undefined) ?? defaultConfig.allowedTools,
    approvalPhrases: (parsed.approvalPhrases as string[] | undefined) ?? defaultConfig.approvalPhrases
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateStringArray(config: Record<string, unknown>, field: keyof MatrixConfig): void {
  const value = config[field];
  if (value !== undefined && (!Array.isArray(value) || value.some((entry) => typeof entry !== "string"))) {
    throw new Error(`Config field ${field} must be an array of strings`);
  }
}
