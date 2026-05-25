import { describe, expect, it } from "vitest";
import {
  findJsonFiles,
  findJsonlFiles,
  parseJsonl,
  readFileSafe,
} from "./utils";

describe("fs/utils", () => {
  describe("parseJsonl", () => {
    it("parses valid JSONL content", () => {
      const result = parseJsonl<{ a: number }>('{"a":1}\n{"a":2}\n');
      expect(result).toEqual([{ a: 1 }, { a: 2 }]);
    });

    it("skips empty lines", () => {
      const result = parseJsonl('{"a":1}\n\n\n{"a":2}\n');
      expect(result).toEqual([{ a: 1 }, { a: 2 }]);
    });

    it("skips malformed lines", () => {
      const result = parseJsonl('{"a":1}\nbad json\n{"a":2}\n');
      expect(result).toEqual([{ a: 1 }, { a: 2 }]);
    });

    it("returns empty array for empty content", () => {
      expect(parseJsonl("")).toEqual([]);
      expect(parseJsonl("\n\n")).toEqual([]);
    });
  });

  describe("readFileSafe", () => {
    it("returns null for non-existent file", () => {
      expect(readFileSafe("/nonexistent/file.txt")).toBeNull();
    });

    it("returns content for existing file", () => {
      const { mkdtempSync, writeFileSync, rmSync } = require("node:fs");
      const { tmpdir } = require("node:os");
      const { join } = require("node:path");
      const tmp = mkdtempSync(join(tmpdir(), "ta-utils-"));
      const filePath = join(tmp, "test.txt");
      writeFileSync(filePath, "hello");
      expect(readFileSafe(filePath)).toBe("hello");
      rmSync(tmp, { force: true, recursive: true });
    });
  });

  describe("findJsonFiles", () => {
    it("returns empty array for non-existent directory", () => {
      expect(findJsonFiles("/nonexistent", /\.json$/)).toEqual([]);
    });

    it("finds matching JSON files", () => {
      const { mkdtempSync, writeFileSync, rmSync } = require("node:fs");
      const { tmpdir } = require("node:os");
      const { join } = require("node:path");
      const tmp = mkdtempSync(join(tmpdir(), "ta-utils-"));
      writeFileSync(join(tmp, "data.json"), "{}");
      writeFileSync(join(tmp, "other.txt"), "text");
      const result = findJsonFiles(tmp, /\.json$/);
      expect(result).toHaveLength(1);
      expect(result[0]).toContain("data.json");
      rmSync(tmp, { force: true, recursive: true });
    });
  });

  describe("findJsonlFiles", () => {
    it("returns empty array for non-existent directory", () => {
      expect(findJsonlFiles("/nonexistent")).toEqual([]);
    });

    it("recursively finds .jsonl files", () => {
      const {
        mkdtempSync,
        writeFileSync,
        mkdirSync,
        rmSync,
      } = require("node:fs");
      const { tmpdir } = require("node:os");
      const { join } = require("node:path");
      const tmp = mkdtempSync(join(tmpdir(), "ta-utils-"));
      mkdirSync(join(tmp, "subdir"), { recursive: true });
      writeFileSync(join(tmp, "a.jsonl"), "line1");
      writeFileSync(join(tmp, "subdir", "b.jsonl"), "line2");
      writeFileSync(join(tmp, "c.txt"), "text");
      const result = findJsonlFiles(tmp);
      expect(result).toHaveLength(2);
      rmSync(tmp, { force: true, recursive: true });
    });
  });
});
