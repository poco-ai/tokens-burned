import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { logger } from "../../utils/logger";
import {
  ensureAppRuntimeDirs,
  getServiceLogPath,
  getServiceWrapperPath,
} from "../runtime/paths";
import type { ServiceManifest } from "./manifest";

const SERVICE_LABEL = "ai.poco.tokens-burned.sync";
const LAUNCH_AGENTS_DIR = join(homedir(), "Library", "LaunchAgents");

export interface LaunchdInstallOptions {
  intervalMs: number;
}

export interface LaunchdStatus {
  installed: boolean;
  label: string;
  loaded: boolean;
  logPath: string;
  plistPath: string;
  wrapperPath: string;
}

export interface CliInvocation {
  args: string[];
  program: string;
  workingDirectory: string;
}

function assertDarwin(): void {
  if (process.platform !== "darwin") {
    throw new Error("Background service is currently supported on macOS only.");
  }
}

function getLaunchAgentPath(label = SERVICE_LABEL): string {
  return join(LAUNCH_AGENTS_DIR, `${label}.plist`);
}

function getGuiDomain(): string {
  if (typeof process.getuid !== "function") {
    throw new Error("Could not determine current macOS user id.");
  }

  return `gui/${process.getuid()}`;
}

function getServiceTarget(label = SERVICE_LABEL): string {
  return `${getGuiDomain()}/${label}`;
}

function runLaunchctl(args: string[]) {
  const result = spawnSync("launchctl", args, {
    encoding: "utf-8",
  });

  if (result.error) {
    throw result.error;
  }

  return result;
}

function tryBootout(label = SERVICE_LABEL): void {
  const result = runLaunchctl(["bootout", getServiceTarget(label)]);
  if (result.status === 0) {
    return;
  }

  const output = `${result.stdout}${result.stderr}`.toLowerCase();
  if (
    output.includes("could not find service") ||
    output.includes("no such process") ||
    output.includes("service is not loaded")
  ) {
    return;
  }

  throw new Error(result.stderr || result.stdout || "launchctl bootout failed");
}

function ensureLaunchAgentsDir(): void {
  mkdirSync(LAUNCH_AGENTS_DIR, { recursive: true });
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function getCliEntryPath(): string {
  const entry = process.argv[1];
  if (!entry) {
    throw new Error("Could not resolve CLI entry path.");
  }

  const absolutePath = isAbsolute(entry)
    ? entry
    : resolve(process.cwd(), entry);
  return existsSync(absolutePath) ? realpathSync(absolutePath) : absolutePath;
}

function resolveCurrentCliInvocation(): CliInvocation {
  const entryPath = getCliEntryPath();
  const workingDirectory = dirname(dirname(entryPath));

  if (entryPath.endsWith(".ts")) {
    const require = createRequire(import.meta.url);
    const tsxPackagePath = require.resolve("tsx/package.json");
    const tsxCliPath = join(dirname(tsxPackagePath), "dist", "cli.mjs");

    return {
      args: [tsxCliPath, entryPath],
      program: process.execPath,
      workingDirectory,
    };
  }

  return {
    args: [entryPath],
    program: process.execPath,
    workingDirectory,
  };
}

export function buildServiceWrapperScript(invocation: CliInvocation): string {
  const command = [
    shellQuote(invocation.program),
    ...invocation.args.map(shellQuote),
    "sync",
    "--quiet",
    "--service-mode",
  ].join(" ");

  return [
    "#!/bin/sh",
    "set -eu",
    `export PATH=${shellQuote(process.env.PATH || "/usr/bin:/bin:/usr/sbin:/sbin")}`,
    "export TOKENS_BURNED_SERVICE=1",
    `cd ${shellQuote(invocation.workingDirectory)}`,
    `exec ${command}`,
    "",
  ].join("\n");
}

export function buildLaunchAgentPlist(input: {
  intervalSeconds: number;
  label: string;
  logPath: string;
  workingDirectory: string;
  wrapperPath: string;
}): string {
  const { intervalSeconds, label, logPath, workingDirectory, wrapperPath } =
    input;

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>${escapeXml(label)}</string>
    <key>ProgramArguments</key>
    <array>
      <string>${escapeXml(wrapperPath)}</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${escapeXml(workingDirectory)}</string>
    <key>StartInterval</key>
    <integer>${intervalSeconds}</integer>
    <key>RunAtLoad</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${escapeXml(logPath)}</string>
    <key>StandardErrorPath</key>
    <string>${escapeXml(logPath)}</string>
  </dict>
</plist>
`;
}

export function isLaunchdServiceLoaded(label = SERVICE_LABEL): boolean {
  assertDarwin();
  const result = runLaunchctl(["print", getServiceTarget(label)]);
  return result.status === 0;
}

export function installLaunchdService(
  opts: LaunchdInstallOptions,
): ServiceManifest {
  assertDarwin();
  ensureAppRuntimeDirs();
  ensureLaunchAgentsDir();

  const intervalSeconds = Math.max(60, Math.round(opts.intervalMs / 1000));
  const invocation = resolveCurrentCliInvocation();
  const label = SERVICE_LABEL;
  const logPath = getServiceLogPath();
  const wrapperPath = getServiceWrapperPath();
  const plistPath = getLaunchAgentPath(label);

  writeFileSync(wrapperPath, buildServiceWrapperScript(invocation), "utf-8");
  chmodSync(wrapperPath, 0o755);

  writeFileSync(
    plistPath,
    buildLaunchAgentPlist({
      intervalSeconds,
      label,
      logPath,
      workingDirectory: invocation.workingDirectory,
      wrapperPath,
    }),
    "utf-8",
  );

  tryBootout(label);

  const bootstrap = runLaunchctl(["bootstrap", getGuiDomain(), plistPath]);
  if (bootstrap.status !== 0) {
    throw new Error(
      bootstrap.stderr || bootstrap.stdout || "launchctl bootstrap failed",
    );
  }

  logger.info(
    `Installed macOS LaunchAgent ${label} (${Math.round(intervalSeconds / 60)}m interval).`,
  );

  return {
    installedAt: new Date().toISOString(),
    intervalMs: intervalSeconds * 1000,
    label,
    logPath,
    platform: "darwin-launchd",
    plistPath,
    workingDirectory: invocation.workingDirectory,
    wrapperPath,
  };
}

export function startLaunchdService(label = SERVICE_LABEL): void {
  assertDarwin();

  const plistPath = getLaunchAgentPath(label);
  if (!existsSync(plistPath)) {
    throw new Error("Service is not installed.");
  }

  if (!isLaunchdServiceLoaded(label)) {
    const bootstrap = runLaunchctl(["bootstrap", getGuiDomain(), plistPath]);
    if (bootstrap.status !== 0) {
      throw new Error(
        bootstrap.stderr || bootstrap.stdout || "launchctl bootstrap failed",
      );
    }
    return;
  }

  const kickstart = runLaunchctl(["kickstart", "-k", getServiceTarget(label)]);
  if (kickstart.status !== 0) {
    throw new Error(
      kickstart.stderr || kickstart.stdout || "launchctl kickstart failed",
    );
  }
}

export function stopLaunchdService(label = SERVICE_LABEL): void {
  assertDarwin();
  tryBootout(label);
}

export function uninstallLaunchdService(label = SERVICE_LABEL): void {
  assertDarwin();
  const plistPath = getLaunchAgentPath(label);
  const wrapperPath = getServiceWrapperPath();

  tryBootout(label);

  rmSync(plistPath, { force: true });
  rmSync(wrapperPath, { force: true });
}

export function getLaunchdStatus(label = SERVICE_LABEL): LaunchdStatus {
  assertDarwin();
  return {
    installed: existsSync(getLaunchAgentPath(label)),
    label,
    loaded: isLaunchdServiceLoaded(label),
    logPath: getServiceLogPath(),
    plistPath: getLaunchAgentPath(label),
    wrapperPath: getServiceWrapperPath(),
  };
}

export function getLaunchdLabel(): string {
  return SERVICE_LABEL;
}
