#!/usr/bin/env node
import { writeFile } from "node:fs/promises";

import { loadConfig, renderJson, renderMarkdown, scanSkills } from "./index.js";
import type { OutputFormat } from "./types.js";

interface CliArgs {
  command?: string;
  dir?: string;
  format: OutputFormat;
  config?: string;
  out?: string;
}

class UsageError extends Error {}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.command !== "scan" || !args.dir) {
    usage();
    process.exitCode = 2;
    return;
  }
  const config = await loadConfig(args.config);
  const result = await scanSkills(args.dir, { config });
  const output = args.format === "json" ? renderJson(result) : renderMarkdown(result);
  if (args.out) {
    await writeFile(args.out, output);
  } else {
    process.stdout.write(output);
  }
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { command: argv[0], dir: argv[1], format: "markdown" };
  const seen = new Set<string>();
  for (let index = 2; index < argv.length; index += 1) {
    const value = argv[index];
    if (value !== "--format" && value !== "--config" && value !== "--out") {
      throw new UsageError(`Unknown option: ${value}`);
    }
    if (seen.has(value)) throw new UsageError(`Option specified more than once: ${value}`);
    seen.add(value);
    const optionValue = argv[++index];
    if (!optionValue || optionValue.startsWith("--")) throw new UsageError(`Missing value for ${value}`);
    if (value === "--format") args.format = parseFormat(optionValue);
    else if (value === "--config") args.config = optionValue;
    else args.out = optionValue;
  }
  return args;
}

function parseFormat(value: string | undefined): OutputFormat {
  if (value === "json" || value === "markdown") return value;
  throw new UsageError(`Unsupported format: ${value ?? ""}`);
}

function usage(): void {
  process.stderr.write("Usage: skill-permission-matrix scan <dir> [--format markdown|json] [--config file] [--out file]\n");
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  if (error instanceof UsageError) usage();
  process.exitCode = error instanceof UsageError ? 2 : 1;
});
