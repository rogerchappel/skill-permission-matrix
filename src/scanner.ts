import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

import { defaultConfig } from "./config.js";
import type { MatrixConfig, ScanOptions, ScanResult, SkillPermissionRow } from "./types.js";

const liveActionWords = /\b(send|post|publish|delete|update|create|merge|approve|install|deploy|charge|email|notify)\b/i;
const writeWords = /\b(write|edit|modify|delete|create|save|append|overwrite|apply_patch)\b/i;
const networkWords = /\b(network|http|https|api|web|external service|internet|fetch|download|upload)\b/i;
const broadWords = /\b(any|all|every|entire|unrestricted|full access|outside the workspace)\b/i;

export async function scanSkills(root: string, options: ScanOptions = {}): Promise<ScanResult> {
  const config: MatrixConfig = {
    allowedTools: options.config?.allowedTools ?? defaultConfig.allowedTools,
    approvalPhrases: options.config?.approvalPhrases ?? defaultConfig.approvalPhrases
  };
  const files = await findSkillFiles(root);
  const rows = await Promise.all(files.map((file) => analyzeSkill(root, file, config)));
  rows.sort((a, b) => a.path.localeCompare(b.path));
  return {
    root,
    rows,
    summary: {
      skillCount: rows.length,
      warningCount: rows.reduce((total, row) => total + row.warnings.length, 0)
    }
  };
}

async function findSkillFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const found: string[] = [];
  for (const entry of entries) {
    const fullPath = join(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") continue;
      found.push(...await findSkillFiles(fullPath));
    } else if (entry.isFile() && entry.name === "SKILL.md") {
      found.push(fullPath);
    }
  }
  return found;
}

async function analyzeSkill(root: string, file: string, config: MatrixConfig): Promise<SkillPermissionRow> {
  const content = await readFile(file, "utf8");
  const sections = splitSections(content);
  const lines = content.split(/\r?\n/);
  const name = firstHeading(content) ?? relative(root, file).split("/").at(-2) ?? "skill";
  const tools = extractTools(content);
  const inputs = extractList(sections, ["required inputs", "inputs"]);
  const externalActions = matchingLines(lines, liveActionWords);
  const filesystemWrites = matchingLines(lines, writeWords).filter((line) => /\b(file|filesystem|workspace|write|edit|modify|delete|create|save|apply_patch)\b/i.test(line));
  const networkClaims = matchingLines(lines, networkWords);
  const approvalRequirements = extractApprovalLines(lines, config.approvalPhrases);
  const validationCommands = extractCodeCommands(content);
  const warnings = buildWarnings({
    content,
    tools,
    filesystemWrites,
    networkClaims,
    externalActions,
    approvalRequirements,
    config
  });

  return {
    name,
    path: relative(root, file),
    tools,
    inputs,
    externalActions,
    filesystemWrites,
    networkClaims,
    approvalRequirements,
    validationCommands,
    warnings
  };
}

function splitSections(content: string): Map<string, string[]> {
  const sections = new Map<string, string[]>();
  let current = "overview";
  for (const line of content.split(/\r?\n/)) {
    const heading = line.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      current = heading[1].trim().toLowerCase();
      sections.set(current, []);
      continue;
    }
    sections.set(current, [...(sections.get(current) ?? []), line]);
  }
  return sections;
}

function firstHeading(content: string): string | undefined {
  return content.match(/^#\s+(.+)$/m)?.[1].trim();
}

function extractTools(content: string): string[] {
  const explicit = [...content.matchAll(/`([a-z][a-z0-9_-]+)`/gi)].map((match) => match[1]);
  const toolLine = content.match(/(?:tools?|required tools?)\s*:\s*([^\n]+)/i)?.[1]?.split(/[,\s]+/) ?? [];
  return unique([...explicit, ...toolLine].map(cleanToken).filter(Boolean));
}

function extractList(sections: Map<string, string[]>, names: string[]): string[] {
  const lines = names.flatMap((name) => sections.get(name) ?? []);
  return unique(lines.map((line) => line.replace(/^[-*]\s*/, "").trim()).filter(Boolean));
}

function matchingLines(lines: string[], pattern: RegExp): string[] {
  return unique(lines.map((line) => line.trim()).filter((line) => pattern.test(line) && !line.startsWith("#")));
}

function extractApprovalLines(lines: string[], phrases: string[]): string[] {
  const lowered = phrases.map((phrase) => phrase.toLowerCase());
  return unique(lines.map((line) => line.trim()).filter((line) => lowered.some((phrase) => line.toLowerCase().includes(phrase))));
}

function extractCodeCommands(content: string): string[] {
  const commands: string[] = [];
  for (const block of content.matchAll(/```(?:bash|sh)?\n([\s\S]*?)```/g)) {
    for (const line of block[1].split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) commands.push(trimmed);
    }
  }
  return unique(commands);
}

function buildWarnings(input: {
  content: string;
  tools: string[];
  filesystemWrites: string[];
  networkClaims: string[];
  externalActions: string[];
  approvalRequirements: string[];
  config: MatrixConfig;
}): string[] {
  const warnings: string[] = [];
  if (!/side-?effect boundaries/i.test(input.content)) warnings.push("missing side-effect boundary section");
  if (input.externalActions.length > 0 && input.approvalRequirements.length === 0) warnings.push("live-action language without approval requirement");
  if (input.approvalRequirements.length === 0) warnings.push("missing approval requirement");
  for (const tool of input.tools) {
    if (!input.config.allowedTools.includes(tool) && /^[a-z][a-z0-9_-]+$/.test(tool)) warnings.push(`unknown tool: ${tool}`);
  }
  if (input.filesystemWrites.some((line) => broadWords.test(line))) warnings.push("broad filesystem write language");
  if (input.networkClaims.some((line) => broadWords.test(line))) warnings.push("broad network language");
  return unique(warnings);
}

function cleanToken(token: string): string {
  return token.replace(/[^a-z0-9_-]/gi, "").trim();
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
