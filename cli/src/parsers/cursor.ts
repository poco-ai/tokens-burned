import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { aggregateToBuckets } from "../domain/aggregator";
import type { ParseResult, TokenUsageEntry } from "../domain/types";
import { registerParser } from "./registry";
import type { IParser, ToolDefinition } from "./types";

const TOOL_ID = "cursor";
const TOOL_NAME = "Cursor";
const STATE_DB_RELATIVE = join("User", "globalStorage", "state.vscdb");
const ACCESS_TOKEN_KEY = "cursorAuth/accessToken";
const SESSION_COOKIE = "WorkosCursorSessionToken";
const FETCH_TIMEOUT_MS = 10_000;

function getDefaultStateDbPath(): string {
  if (process.platform === "darwin") {
    return join(
      homedir(),
      "Library",
      "Application Support",
      "Cursor",
      STATE_DB_RELATIVE,
    );
  }
  if (process.platform === "win32") {
    const appData =
      process.env.APPDATA?.trim() || join(homedir(), "AppData", "Roaming");
    return join(appData, "Cursor", STATE_DB_RELATIVE);
  }
  const xdgConfigHome =
    process.env.XDG_CONFIG_HOME?.trim() || join(homedir(), ".config");
  return join(xdgConfigHome, "Cursor", STATE_DB_RELATIVE);
}

function getCursorStateDbPath(): string | null {
  const explicit = process.env.CURSOR_STATE_DB_PATH?.trim();
  if (explicit) {
    const resolved = resolve(explicit);
    return existsSync(resolved) ? resolved : null;
  }

  const configDirs = process.env.CURSOR_CONFIG_DIR?.trim();
  const candidates = configDirs
    ? configDirs
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
        .map((v) => {
          const r = resolve(v);
          return r.endsWith(".vscdb") ? r : join(r, STATE_DB_RELATIVE);
        })
    : [getDefaultStateDbPath()];

  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

function queryAccessToken(dbPath: string): string | null {
  const sql = `SELECT value FROM ItemTable WHERE key = '${ACCESS_TOKEN_KEY}' LIMIT 1`;
  const candidates = [
    process.env.TOKEN_ARENA_SQLITE3,
    "sqlite3",
    "sqlite3.exe",
  ].filter((value): value is string => Boolean(value));

  for (const command of candidates) {
    try {
      const out = execFileSync(command, ["-json", dbPath, sql], {
        encoding: "utf-8",
        maxBuffer: 4 * 1024 * 1024,
        timeout: 15000,
        windowsHide: true,
      }).trim();

      if (!out || out === "[]") continue;
      const rows = JSON.parse(out) as Array<{ value?: string }>;
      const value = rows[0]?.value;
      if (typeof value !== "string") continue;
      const token = value.trim();
      if (token) return token;
    } catch (err) {
      const nodeError = err as NodeJS.ErrnoException & { status?: number };
      if (nodeError.status === 127 || nodeError.message?.includes("ENOENT")) {
        continue;
      }
      throw err;
    }
  }
  return null;
}

function readAccessToken(dbPath: string): string | null {
  try {
    return queryAccessToken(dbPath);
  } catch (err) {
    if (!isLockError(err)) throw err;

    const snapshotDir = mkdtempSync(join(tmpdir(), "tokenarena-cursor-"));
    const queryPath = join(snapshotDir, "state.vscdb");
    try {
      copyFileSync(dbPath, queryPath);
      for (const suffix of ["-shm", "-wal"]) {
        const companion = `${dbPath}${suffix}`;
        if (existsSync(companion))
          copyFileSync(companion, `${queryPath}${suffix}`);
      }
      return queryAccessToken(queryPath);
    } finally {
      rmSync(snapshotDir, { recursive: true, force: true });
    }
  }
}

function isLockError(err: unknown): boolean {
  return err instanceof Error && /database is locked/i.test(err.message);
}

function decodeJwtSub(token: string): string | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64.padEnd(Math.ceil(b64.length / 4) * 4, "=");
    const json = JSON.parse(Buffer.from(padded, "base64").toString("utf-8"));
    return typeof json.sub === "string" ? json.sub.trim() : null;
  } catch {
    return null;
  }
}

async function fetchUsageCsv(token: string): Promise<string> {
  const baseUrl = (
    process.env.CURSOR_WEB_BASE_URL?.trim() || "https://cursor.com"
  ).replace(/\/+$/, "");
  const url = `${baseUrl}/api/dashboard/export-usage-events-csv?strategy=tokens`;
  const sub = decodeJwtSub(token);
  const cookieValues = sub ? [token, `${sub}::${token}`] : [token];

  const attempts: Array<Record<string, string>> = [
    { Authorization: `Bearer ${token}` },
  ];
  for (const cv of cookieValues) {
    attempts.push({ Cookie: `${SESSION_COOKIE}=${cv}` });
    attempts.push({
      Authorization: `Bearer ${token}`,
      Cookie: `${SESSION_COOKIE}=${cv}`,
    });
  }

  const failures: string[] = [];
  for (const headers of attempts) {
    let resp: Response;
    try {
      resp = await fetch(url, {
        headers: { Accept: "text/csv,*/*;q=0.8", ...headers },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch (e) {
      const reason =
        e instanceof Error && e.name === "TimeoutError"
          ? "timeout"
          : `network: ${(e as Error).message}`;
      const err = new Error(`Cursor usage export skipped (${reason})`);
      (err as { skip?: boolean }).skip = true;
      throw err;
    }
    if (resp.ok) return await resp.text();
    failures.push(`${resp.status} ${resp.statusText}`);
  }

  throw new Error(`Cursor usage export auth failed (${failures.join("; ")})`);
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (c === "\r") {
      i++;
      continue;
    }
    if (c === "\n") {
      row.push(field);
      rows.push(row);
      field = "";
      row = [];
      i++;
      continue;
    }
    field += c;
    i++;
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const t = String(value).trim();
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return new Date(`${t}T00:00:00Z`);
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseInt0(value: string | undefined): number {
  if (value == null) return 0;
  const n = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

export interface CursorParserOptions {
  dbPath?: string;
  readToken?: (dbPath: string) => string | null;
  fetchCsv?: (token: string) => Promise<string>;
}

function createToolDefinition(dbPath: string): ToolDefinition {
  return {
    id: TOOL_ID,
    name: TOOL_NAME,
    dataDir: dirname(dbPath),
  };
}

export class CursorParser implements IParser {
  readonly tool: ToolDefinition;
  private readonly dbPath: string;
  private readonly readToken: (dbPath: string) => string | null;
  private readonly fetchCsv: (token: string) => Promise<string>;

  constructor(options: CursorParserOptions = {}) {
    this.dbPath = options.dbPath || getCursorStateDbPath() || "";
    this.readToken = options.readToken || readAccessToken;
    this.fetchCsv = options.fetchCsv || fetchUsageCsv;
    this.tool = createToolDefinition(this.dbPath);
  }

  async parse(): Promise<ParseResult> {
    if (!this.dbPath || !existsSync(this.dbPath)) {
      return { buckets: [], sessions: [] };
    }

    let token: string | null;
    try {
      token = this.readToken(this.dbPath);
    } catch (err) {
      if (err instanceof Error && err.message.includes("ENOENT")) {
        throw new Error(
          "sqlite3 CLI not found. Install sqlite3 to sync Cursor data.",
        );
      }
      throw err;
    }
    if (!token) return { buckets: [], sessions: [] };

    let csv: string;
    try {
      csv = await this.fetchCsv(token);
    } catch (err) {
      if ((err as { skip?: boolean }).skip)
        return { buckets: [], sessions: [] };
      throw err;
    }

    const rows = parseCsv(csv);
    if (rows.length < 2) return { buckets: [], sessions: [] };

    const header = rows[0].map((h) => h.trim());
    const idx = (name: string) => header.indexOf(name);
    const dateIdx = idx("Date");
    const modelIdx = idx("Model");
    const inputCacheWriteIdx = idx("Input (w/ Cache Write)");
    const inputNoCacheIdx = idx("Input (w/o Cache Write)");
    const cacheReadIdx = idx("Cache Read");
    const outputIdx = idx("Output Tokens");

    if (dateIdx < 0 || modelIdx < 0) return { buckets: [], sessions: [] };

    const entries: TokenUsageEntry[] = [];
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (row.length === 1 && row[0].trim() === "") continue;

      const timestamp = parseDate(row[dateIdx]);
      const model = row[modelIdx]?.trim();
      if (!timestamp || !model) continue;

      const inputCacheWrite =
        inputCacheWriteIdx >= 0 ? parseInt0(row[inputCacheWriteIdx]) : 0;
      const inputNoCache =
        inputNoCacheIdx >= 0 ? parseInt0(row[inputNoCacheIdx]) : 0;
      const cacheRead = cacheReadIdx >= 0 ? parseInt0(row[cacheReadIdx]) : 0;
      const output = outputIdx >= 0 ? parseInt0(row[outputIdx]) : 0;

      if (inputCacheWrite + inputNoCache + cacheRead + output === 0) continue;

      entries.push({
        source: TOOL_ID,
        model,
        project: "unknown",
        timestamp,
        inputTokens: inputCacheWrite + inputNoCache,
        outputTokens: output,
        cachedTokens: cacheRead,
        reasoningTokens: 0,
      });
    }

    return {
      buckets: aggregateToBuckets(entries),
      sessions: [],
    };
  }

  isInstalled(): boolean {
    return existsSync(this.dbPath);
  }
}

registerParser(new CursorParser());
