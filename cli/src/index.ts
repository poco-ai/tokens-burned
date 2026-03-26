#!/usr/bin/env node
// Import parsers to register them before CLI setup
import { pathToFileURL } from "node:url";
import "./parsers/claude-code.js";
import "./parsers/codex.js";
import "./parsers/gemini-cli.js";
import "./parsers/copilot-cli.js";
import "./parsers/opencode.js";
import "./parsers/openclaw.js";

import { createCli } from "./cli.js";

export function normalizeArgv(argv: string[]) {
  return argv.filter((arg, index) => index < 2 || arg !== "--");
}

export function run(argv = process.argv) {
  const program = createCli();
  program.parse(normalizeArgv(argv));
}

const isMainModule =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  run();
}
