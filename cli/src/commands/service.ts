import { existsSync, readFileSync, rmSync } from "node:fs";
import { loadConfig, saveConfig } from "../infrastructure/config/manager";
import { getServiceManifestPath } from "../infrastructure/runtime/paths";
import { loadSyncState } from "../infrastructure/runtime/state";
import {
  getLaunchdLabel,
  getLaunchdStatus,
  installLaunchdService,
  startLaunchdService,
  stopLaunchdService,
  uninstallLaunchdService,
} from "../infrastructure/service/launchd";
import {
  loadServiceManifest,
  saveServiceManifest,
} from "../infrastructure/service/manifest";
import { logger } from "../utils/logger";

const DEFAULT_INTERVAL = 5 * 60_000;

export interface ServiceInstallOptions {
  interval?: number;
}

function assertDarwin(): void {
  if (process.platform !== "darwin") {
    logger.error("Background service is currently supported on macOS only.");
    process.exit(1);
  }
}

function formatInterval(ms: number): string {
  if (ms % 3_600_000 === 0) {
    return `${Math.round(ms / 3_600_000)}h`;
  }

  if (ms % 60_000 === 0) {
    return `${Math.round(ms / 60_000)}m`;
  }

  return `${Math.round(ms / 1000)}s`;
}

function formatMaybe(value?: string): string {
  return value || "(never)";
}

function tailLines(content: string, count: number): string {
  return content.split("\n").slice(-count).join("\n").trim();
}

export async function runServiceInstall(
  opts: ServiceInstallOptions = {},
): Promise<void> {
  assertDarwin();

  const config = loadConfig();
  if (!config?.apiKey) {
    logger.error("Not configured. Run `tokens-burned init` first.");
    process.exit(1);
  }

  const interval = opts.interval || config.syncInterval || DEFAULT_INTERVAL;
  if (interval < 60_000) {
    logger.error("Service interval must be at least 60000ms.");
    process.exit(1);
  }

  saveConfig({ ...config, syncInterval: interval });

  try {
    const manifest = installLaunchdService({ intervalMs: interval });
    saveServiceManifest(manifest);

    logger.info(`Service label: ${manifest.label}`);
    logger.info(`Plist: ${manifest.plistPath}`);
    logger.info(`Logs: ${manifest.logPath}`);
  } catch (error) {
    logger.error((error as Error).message);
    process.exit(1);
  }
}

export async function runServiceUninstall(): Promise<void> {
  assertDarwin();

  try {
    uninstallLaunchdService(getLaunchdLabel());
    rmSync(getServiceManifestPath(), { force: true });

    logger.info("Background sync service removed.");
  } catch (error) {
    logger.error((error as Error).message);
    process.exit(1);
  }
}

export async function runServiceStart(): Promise<void> {
  assertDarwin();

  const manifest = loadServiceManifest();
  const label = manifest?.label || getLaunchdLabel();
  const launchd = getLaunchdStatus(label);
  if (!launchd.installed) {
    logger.error("Service is not installed.");
    process.exit(1);
  }

  try {
    startLaunchdService(label);
    logger.info("Background sync service started.");
  } catch (error) {
    logger.error((error as Error).message);
    process.exit(1);
  }
}

export async function runServiceStop(): Promise<void> {
  assertDarwin();

  const manifest = loadServiceManifest();
  const label = manifest?.label || getLaunchdLabel();
  const launchd = getLaunchdStatus(label);
  if (!launchd.installed) {
    logger.error("Service is not installed.");
    process.exit(1);
  }

  try {
    stopLaunchdService(label);
    logger.info("Background sync service stopped.");
  } catch (error) {
    logger.error((error as Error).message);
    process.exit(1);
  }
}

export async function runServiceRestart(): Promise<void> {
  assertDarwin();

  const manifest = loadServiceManifest();
  const label = manifest?.label || getLaunchdLabel();
  const launchd = getLaunchdStatus(label);
  if (!launchd.installed) {
    logger.error("Service is not installed.");
    process.exit(1);
  }

  try {
    stopLaunchdService(label);
    startLaunchdService(label);
    logger.info("Background sync service restarted.");
  } catch (error) {
    logger.error((error as Error).message);
    process.exit(1);
  }
}

export async function runServiceStatus(): Promise<void> {
  assertDarwin();

  const manifest = loadServiceManifest();
  const syncState = loadSyncState();
  const label = manifest?.label || getLaunchdLabel();
  const launchd = getLaunchdStatus(label);

  logger.info("\nbackground sync service\n");
  logger.info(`  Installed: ${launchd.installed ? "yes" : "no"}`);
  logger.info(`  Loaded: ${launchd.loaded ? "yes" : "no"}`);
  logger.info(`  Label: ${launchd.label}`);

  if (manifest) {
    logger.info(`  Interval: ${formatInterval(manifest.intervalMs)}`);
    logger.info(`  Plist: ${manifest.plistPath}`);
    logger.info(`  Wrapper: ${manifest.wrapperPath}`);
    logger.info(`  Logs: ${manifest.logPath}`);
  }

  logger.info("\n  Last sync state:");
  logger.info(`    Status: ${syncState.status}`);
  logger.info(`    Last attempt: ${formatMaybe(syncState.lastAttemptAt)}`);
  logger.info(`    Last success: ${formatMaybe(syncState.lastSuccessAt)}`);
  if (syncState.lastError) {
    logger.info(`    Last error: ${syncState.lastError}`);
  }
  if (syncState.lastResult) {
    logger.info(
      `    Last result: ${syncState.lastResult.buckets} buckets, ${syncState.lastResult.sessions} sessions`,
    );
  }
  logger.info("");
}

export async function runServiceLogs(): Promise<void> {
  assertDarwin();

  const manifest = loadServiceManifest();
  const logPath = manifest?.logPath || getLaunchdStatus().logPath;

  if (!existsSync(logPath)) {
    logger.info(`No service log file yet: ${logPath}`);
    return;
  }

  const content = readFileSync(logPath, "utf-8");
  const tail = tailLines(content, 200);
  if (!tail) {
    logger.info(`Service log is empty: ${logPath}`);
    return;
  }

  process.stdout.write(`${tail}\n`);
}
