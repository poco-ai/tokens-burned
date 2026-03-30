// Import parsers to register them before CLI setup
import "./parsers/claude-code.js";
import "./parsers/codex.js";
import "./parsers/gemini-cli.js";
import "./parsers/copilot-cli.js";
import "./parsers/opencode.js";
import "./parsers/openclaw.js";

import { createCli } from "./cli.js";
import { isMainModule } from "./infrastructure/runtime/main-module.js";

export function normalizeArgv(argv: string[]) {
  return argv.filter((arg, index) => index < 2 || arg !== "--");
}

export async function run(argv = process.argv) {
  const program = createCli();
  await program.parseAsync(normalizeArgv(argv));
}

if (isMainModule()) {
  void run();
}
