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
  for (let index = 2; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--format") args.format = parseFormat(argv[++index]);
    else if (value === "--config") args.config = argv[++index];
    else if (value === "--out") args.out = argv[++index];
  }
  return args;
}

function parseFormat(value: string | undefined): OutputFormat {
  if (value === "json" || value === "markdown") return value;
  throw new Error(`Unsupported format: ${value ?? ""}`);
}

function usage(): void {
  process.stderr.write("Usage: skill-permission-matrix scan <dir> [--format markdown|json] [--config file] [--out file]\n");
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
