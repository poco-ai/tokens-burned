import { createInterface } from "node:readline";
import { execFile } from "node:child_process";
import { platform } from "node:os";
import { loadConfig, saveConfig, validateApiKey, getDefaultApiUrl } from "../infrastructure/config/manager";
import { ApiClient } from "../infrastructure/api/client";
import { runSync } from "../services/sync-service";
import { getDetectedTools } from "../services/parser-service";
import { logger } from "../utils/logger";

function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function openBrowser(url: string): void {
  const cmds: Record<string, string> = {
    darwin: "open",
    linux: "xdg-open",
    win32: "start",
  };
  const cmd = cmds[platform()] || cmds.linux;
  execFile(cmd, [url], () => {});
}

export interface InitOptions {
  apiUrl?: string;
}

export async function runInit(opts: InitOptions = {}): Promise<void> {
  logger.info("\n  tokens-burned - Token Usage Tracker\n");

  const existing = loadConfig();
  if (existing?.apiKey) {
    const answer = await prompt("Config already exists. Overwrite? (y/N) ");
    if (answer.toLowerCase() !== "y") {
      logger.info("Cancelled.");
      return;
    }
  }

  const apiUrl = opts.apiUrl || getDefaultApiUrl();
  logger.info(`Get your API key at: ${apiUrl}/usage/setup\n`);
  openBrowser(`${apiUrl}/usage/setup`);

  let apiKey: string;
  while (true) {
    apiKey = await prompt("Paste your API key: ");
    if (validateApiKey(apiKey)) break;
    logger.info('Invalid key — must start with "vbu_". Try again.');
  }

  logger.info(`\nVerifying key ${apiKey.slice(0, 8)}...`);
  try {
    const client = new ApiClient(apiUrl, apiKey);
    await client.ingest([]);
    logger.info("Key verified.\n");
  } catch (err) {
    if ((err as Error).message === "UNAUTHORIZED") {
      logger.error("Invalid API key. Please check and try again.");
      process.exit(1);
    }
    logger.info("Could not verify key (network error). Saving anyway.\n");
  }

  const config = {
    apiKey,
    apiUrl,
  };
  saveConfig(config);

  const tools = getDetectedTools();
  if (tools.length > 0) {
    logger.info(`Detected tools: ${tools.map((t) => t.name).join(", ")}`);
  } else {
    logger.info("No AI coding tools detected. Install one and re-run init.");
  }

  logger.info("\nRunning initial sync...");
  await runSync(config);

  logger.info(`\nSetup complete! View your dashboard at: ${apiUrl}/usage`);
}
