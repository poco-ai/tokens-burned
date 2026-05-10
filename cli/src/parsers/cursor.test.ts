import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { CursorParser } from "./cursor";

const tempDirs: string[] = [];

function makeTempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

const SAMPLE_CSV = `Date,Model,Input (w/ Cache Write),Input (w/o Cache Write),Cache Read,Output Tokens
2025-04-10,claude-sonnet-4.5,1000,500,200,800
2025-04-10,gpt-4o,3000,0,100,400
2025-04-11,claude-sonnet-4.5,0,0,0,0`;

const CSV_WITH_COMMAS = `Date,Model,Input (w/ Cache Write),Input (w/o Cache Write),Cache Read,Output Tokens
2025-04-10,claude-sonnet-4.5,"1,000","2,500","3,200","4,800"`;

const CSV_QUOTED_MODEL = `Date,Model,Input (w/ Cache Write),Input (w/o Cache Write),Cache Read,Output Tokens
2025-04-10,"claude-opus-4.0",100,200,50,300`;

const MOCK_TOKEN = "test-access-token";

function makeParser(csv: string, token: string | null = MOCK_TOKEN) {
  const dataDir = makeTempDir("tokenarena-cursor-");
  const dbPath = join(dataDir, "state.vscdb");
  writeFileSync(dbPath, "", "utf-8");

  return new CursorParser({
    dbPath,
    readToken: () => token,
    fetchCsv: async (t) => {
      expect(t).toBe(MOCK_TOKEN);
      return csv;
    },
  });
}

describe("CursorParser", () => {
  it("parses CSV with multiple models and skips zero-token rows", async () => {
    const parser = makeParser(SAMPLE_CSV);

    const result = await parser.parse();

    expect(result.buckets).toHaveLength(2);

    const sonnetBucket = result.buckets.find(
      (b) => b.model === "claude-sonnet-4.5",
    );
    expect(sonnetBucket).toMatchObject({
      source: "cursor",
      model: "claude-sonnet-4.5",
      project: "unknown",
      inputTokens: 1500,
      outputTokens: 800,
      cachedTokens: 200,
      reasoningTokens: 0,
      totalTokens: 2500,
    });

    const gptBucket = result.buckets.find((b) => b.model === "gpt-4o");
    expect(gptBucket).toMatchObject({
      source: "cursor",
      model: "gpt-4o",
      inputTokens: 3000,
      outputTokens: 400,
      cachedTokens: 100,
      totalTokens: 3500,
    });
  });

  it("parses CSV with comma-formatted numbers", async () => {
    const parser = makeParser(CSV_WITH_COMMAS);

    const result = await parser.parse();

    expect(result.buckets).toHaveLength(1);
    expect(result.buckets[0]).toMatchObject({
      source: "cursor",
      inputTokens: 3500,
      outputTokens: 4800,
      cachedTokens: 3200,
      totalTokens: 11500,
    });
  });

  it("parses CSV with quoted model names", async () => {
    const parser = makeParser(CSV_QUOTED_MODEL);

    const result = await parser.parse();

    expect(result.buckets).toHaveLength(1);
    expect(result.buckets[0].model).toBe("claude-opus-4.0");
  });

  it("returns empty result when db does not exist", async () => {
    const parser = new CursorParser({
      dbPath: "/nonexistent/state.vscdb",
    });

    const result = await parser.parse();
    expect(result.buckets).toEqual([]);
    expect(result.sessions).toEqual([]);
  });

  it("returns empty result when token is null", async () => {
    const parser = makeParser(SAMPLE_CSV, null);

    const result = await parser.parse();
    expect(result.buckets).toEqual([]);
    expect(result.sessions).toEqual([]);
  });

  it("returns empty result when fetchCsv signals skip", async () => {
    const dataDir = makeTempDir("tokenarena-cursor-");
    const dbPath = join(dataDir, "state.vscdb");
    writeFileSync(dbPath, "", "utf-8");

    const parser = new CursorParser({
      dbPath,
      readToken: () => MOCK_TOKEN,
      fetchCsv: async () => {
        const err = new Error("Cursor usage export skipped (timeout)");
        (err as { skip?: boolean }).skip = true;
        throw err;
      },
    });

    const result = await parser.parse();
    expect(result.buckets).toEqual([]);
    expect(result.sessions).toEqual([]);
  });

  it("bubbles up auth failure errors", async () => {
    const dataDir = makeTempDir("tokenarena-cursor-");
    const dbPath = join(dataDir, "state.vscdb");
    writeFileSync(dbPath, "", "utf-8");

    const parser = new CursorParser({
      dbPath,
      readToken: () => MOCK_TOKEN,
      fetchCsv: async () => {
        throw new Error("Cursor usage export auth failed (401 Unauthorized)");
      },
    });

    await expect(parser.parse()).rejects.toThrow(
      "Cursor usage export auth failed",
    );
  });

  it("returns empty for CSV with only headers", async () => {
    const parser = makeParser(
      "Date,Model,Input (w/ Cache Write),Input (w/o Cache Write),Cache Read,Output Tokens",
    );

    const result = await parser.parse();
    expect(result.buckets).toEqual([]);
    expect(result.sessions).toEqual([]);
  });

  it("isInstalled returns true when db exists", () => {
    const dataDir = makeTempDir("tokenarena-cursor-");
    const dbPath = join(dataDir, "state.vscdb");
    writeFileSync(dbPath, "", "utf-8");
    const parser = new CursorParser({ dbPath });

    expect(parser.isInstalled()).toBe(true);
  });

  it("isInstalled returns false when db does not exist", () => {
    const parser = new CursorParser({ dbPath: "/nonexistent/state.vscdb" });
    expect(parser.isInstalled()).toBe(false);
  });
});
