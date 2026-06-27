export type OutputFormat = "markdown" | "json";

export interface MatrixConfig {
  allowedTools: string[];
  approvalPhrases: string[];
}

export interface SkillPermissionRow {
  name: string;
  path: string;
  tools: string[];
  inputs: string[];
  externalActions: string[];
  filesystemWrites: string[];
  networkClaims: string[];
  approvalRequirements: string[];
  validationCommands: string[];
  warnings: string[];
}

export interface ScanOptions {
  config?: Partial<MatrixConfig>;
}

export interface ScanResult {
  root: string;
  rows: SkillPermissionRow[];
  summary: {
    skillCount: number;
    warningCount: number;
  };
}
