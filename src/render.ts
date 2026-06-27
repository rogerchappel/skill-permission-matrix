import type { ScanResult, SkillPermissionRow } from "./types.js";

export function renderJson(result: ScanResult): string {
  return `${JSON.stringify(result, null, 2)}\n`;
}

export function renderMarkdown(result: ScanResult): string {
  const header = [
    "# Skill Permission Matrix",
    "",
    `Root: \`${result.root}\``,
    `Skills: ${result.summary.skillCount}`,
    `Warnings: ${result.summary.warningCount}`,
    "",
    "| Skill | Tools | Writes | Network | Approval | Warnings |",
    "| --- | --- | --- | --- | --- | --- |"
  ];
  const rows = result.rows.map(renderRow);
  return `${[...header, ...rows].join("\n")}\n`;
}

function renderRow(row: SkillPermissionRow): string {
  return [
    cell(`${row.name}<br><code>${row.path}</code>`),
    cell(row.tools.join(", ") || "none declared"),
    cell(row.filesystemWrites.length ? summarize(row.filesystemWrites) : "none found"),
    cell(row.networkClaims.length ? summarize(row.networkClaims) : "none found"),
    cell(row.approvalRequirements.length ? summarize(row.approvalRequirements) : "missing"),
    cell(row.warnings.join("; ") || "none")
  ].join(" | ").replace(/^/, "| ").replace(/$/, " |");
}

function summarize(values: string[]): string {
  return values.slice(0, 2).map((value) => value.length > 80 ? `${value.slice(0, 77)}...` : value).join("<br>");
}

function cell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, "<br>");
}
