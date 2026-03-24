#!/usr/bin/env node
// Import parsers to register them before CLI setup
import "./parsers/claude-code.js";
import "./parsers/codex.js";
import "./parsers/gemini-cli.js";
import "./parsers/copilot-cli.js";
import "./parsers/opencode.js";
import "./parsers/openclaw.js";

import { createCli } from "./cli.js";

const program = createCli();
program.parse();
