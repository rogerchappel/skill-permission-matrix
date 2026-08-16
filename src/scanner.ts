import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

import { defaultConfig } from "./config.js";
import type { MatrixConfig, ScanOptions, ScanResult, SkillPermissionRow } from "./types.js";

const liveActionWords = /\b(send(?:s|ing)?|sent|post(?:s|ed|ing)?|publish(?:es|ed|ing)?|delet(?:e|es|ed|ing)|updat(?:e|es|ed|ing)|creat(?:e|es|ed|ing)|merg(?:e|es|ed|ing)|approv(?:e|es|ed|ing)|install(?:s|ed|ing)?|deploy(?:s|ed|ing)?|charg(?:e|es|ed|ing)|email(?:s|ed|ing)?|notif(?:y|ies|ied|ying))\b/i;
const writeWords = /\b(write|edit|modify|update|delete|create|save|append|overwrite|apply_patch)\b/i;
const networkWords = /\b(network|http|https|api|web|external service|internet|fetch|download|upload)\b/i;
const broadWords = /\b(any|all|every|entire|unrestricted|full access|outside the workspace)\b/i;
const actionKinds = [
  { name: "send", pattern: /\b(send(?:s|ing)?|sent|email(?:s|ed|ing)?|notif(?:y|ies|ied|ying))\b/i },
  { name: "post", pattern: /\b(post(?:s|ed|ing)?|publish(?:es|ed|ing)?)\b/i },
  { name: "delete", pattern: /\bdelet(?:e|es|ed|ing)\b/i },
  { name: "update", pattern: /\bupdat(?:e|es|ed|ing)\b/i },
  { name: "create", pattern: /\bcreat(?:e|es|ed|ing)\b/i },
  { name: "merge", pattern: /\bmerg(?:e|es|ed|ing)\b/i },
  { name: "approve", pattern: /\bapprov(?:e|es|ed|ing)\b/i },
  { name: "install", pattern: /\binstall(?:s|ed|ing)?\b/i },
  { name: "deploy", pattern: /\bdeploy(?:s|ed|ing)?\b/i },
  { name: "charge", pattern: /\bcharg(?:e|es|ed|ing)\b/i }
] as const;

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
  const externalActions = matchingActionStatements(lines).filter((statement) => !negatesAction(statement));
  const filesystemWrites = matchingLines(lines, writeWords)
    .filter((line) => /\b(file|filesystem|workspace|write|edit|modify|update|delete|create|save|apply_patch)\b/i.test(line))
    .filter((line) => !/^\s*-\s*does not\b/i.test(line));
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
  const tools: string[] = [];
  let inToolSection = false;

  for (const line of content.split(/\r?\n/)) {
    const heading = line.match(/^#{1,3}\s+(.+?)\s*$/);
    if (heading) {
      inToolSection = /^(?:required\s+)?tools?$/i.test(heading[1]);
      continue;
    }

    const labeled = line.match(/^\s*(?:[-*]\s*)?(?:required\s+)?tools?\s*:\s*(.+)$/i);
    if (labeled) {
      tools.push(...parseToolList(labeled[1]));
      continue;
    }

    if (inToolSection && /^\s*(?:[-*]\s*)?`?[a-z][a-z0-9_-]*`?(?:\s*,\s*`?[a-z][a-z0-9_-]*`?)*\s*$/i.test(line)) {
      tools.push(...parseToolList(line.replace(/^\s*[-*]\s*/, "")));
    }
  }

  return unique(tools);
}

function parseToolList(value: string): string[] {
  return value
    .split(/\s*,\s*|\s+/)
    .map(cleanToken)
    .filter((token) => /^[a-z][a-z0-9_-]*$/i.test(token));
}

function extractList(sections: Map<string, string[]>, names: string[]): string[] {
  const lines = names.flatMap((name) => sections.get(name) ?? []);
  return unique(lines.map((line) => line.replace(/^[-*]\s*/, "").trim()).filter(Boolean));
}

function matchingLines(lines: string[], pattern: RegExp): string[] {
  return unique(lines.map((line) => line.trim()).filter((line) => pattern.test(line) && !line.startsWith("#")));
}

function matchingActionStatements(lines: string[]): string[] {
  return unique(lines.flatMap((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("#")) return [];
    return splitActionStatements(trimmed).filter((statement) => liveActionWords.test(statement));
  }));
}

function splitActionStatements(line: string): string[] {
  return line
    .split(/\s*(?:[;.!?]+|,?\s+(?:but|and then|then)\s+)\s*/i)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function extractApprovalLines(lines: string[], phrases: string[]): string[] {
  const lowered = phrases.map((phrase) => phrase.toLowerCase());
  return unique(lines.map((line) => line.trim()).filter((line) => {
    if (line.startsWith("#")) return false;
    const normalized = line.toLowerCase().replace(/[’]/g, "'");
    return lowered.some((phrase) => normalized.includes(phrase) && !negatesApproval(normalized, phrase));
  }));
}

function negatesApproval(line: string, phrase: string): boolean {
  const escapedPhrase = escapeRegExp(phrase);
  const approval = phrase === "approval" ? "(?:explicit\\s+)?approval" : escapedPhrase;
  const optionalWords = "(?:[a-z-]+\\s+){0,3}";
  return [
    new RegExp(`\\bno\\s+${optionalWords}${approval}\\s+(?:is\\s+)?(?:required|needed|necessary)\\b`),
    new RegExp(`\\b${approval}\\s+(?:(?:is|are|was|were)\\s+)?(?:not|isn't|aren't|wasn't|weren't)\\s*(?:required|needed|necessary)\\b`),
    new RegExp(`\\b(?:do|does|did)\\s+not\\s+require\\s+${optionalWords}${approval}\\b`),
    new RegExp(`\\b(?:don't|doesn't|didn't)\\s+require\\s+${optionalWords}${approval}\\b`),
    new RegExp(`\\brequires?\\s+no\\s+${optionalWords}${approval}\\b`),
    new RegExp(`\\b(?:may|can|could)\\s+[^.!?]*\\bwithout\\s+${optionalWords}${approval}\\b`)
  ].some((pattern) => pattern.test(line));
}

function negatesAction(line: string): boolean {
  return /^\s*[-*]?\s*(?:do(?:es)? not|never|must not|cannot|can't)\b/i.test(line);
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
  if (input.externalActions.some((action) => !hasScopedApproval(action, input.approvalRequirements))) {
    warnings.push("live-action language without approval requirement");
  }
  if (input.approvalRequirements.length === 0) warnings.push("missing approval requirement");
  for (const tool of input.tools) {
    if (!input.config.allowedTools.includes(tool) && /^[a-z][a-z0-9_-]+$/.test(tool)) warnings.push(`unknown tool: ${tool}`);
  }
  if (input.filesystemWrites.some((line) => broadWords.test(line))) warnings.push("broad filesystem write language");
  if (input.networkClaims.some((line) => broadWords.test(line))) warnings.push("broad network language");
  return unique(warnings);
}

function hasScopedApproval(action: string, approvalRequirements: string[]): boolean {
  const kinds = unique(action.split(/\s*(?:,|\b(?:and|or)\b)\s*/i).flatMap((clause) => {
    const matches = actionKinds
      .map((kind) => ({ kind, index: clause.search(kind.pattern) }))
      .filter(({ index }) => index >= 0)
      .sort((a, b) => a.index - b.index);
    return matches[0]?.kind.name ?? [];
  }));
  return kinds.length > 0 && kinds.every((kind) => approvalRequirements.some((requirement) => {
    if (requirement === action) return true;
    return actionKinds.find((candidate) => candidate.name === kind)?.pattern.test(requirement) ?? false;
  }));
}

function cleanToken(token: string): string {
  return token.replace(/[^a-z0-9_-]/gi, "").trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
