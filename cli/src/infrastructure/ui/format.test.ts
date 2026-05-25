import { describe, expect, it } from "vitest";
import {
  bold,
  cyan,
  dim,
  formatBullet,
  formatDurationMinutes,
  formatHeader,
  formatKeyValue,
  formatMutedPath,
  formatSection,
  formatStatusBadge,
  green,
  magenta,
  maskSecret,
  red,
  yellow,
} from "./format";

describe("format", () => {
  describe("color helpers", () => {
    it("bold returns the value", () => {
      expect(bold("hi")).toContain("hi");
    });

    it("dim returns the value", () => {
      expect(dim("x")).toContain("x");
    });

    it("cyan returns the value", () => {
      expect(cyan("c")).toContain("c");
    });

    it("green returns the value", () => {
      expect(green("g")).toContain("g");
    });

    it("yellow returns the value", () => {
      expect(yellow("y")).toContain("y");
    });

    it("red returns the value", () => {
      expect(red("r")).toContain("r");
    });

    it("magenta returns the value", () => {
      expect(magenta("m")).toContain("m");
    });
  });

  describe("formatHeader", () => {
    it("formats header with title only", () => {
      const result = formatHeader("Title");
      expect(result).toContain("Title");
      expect(result).toMatch(/^\n/);
    });

    it("formats header with subtitle", () => {
      const result = formatHeader("Title", "sub");
      expect(result).toContain("Title");
      expect(result).toContain("sub");
    });
  });

  describe("formatSection", () => {
    it("formats section title", () => {
      const result = formatSection("Section");
      expect(result).toContain("Section");
      expect(result).toMatch(/^\n/);
    });
  });

  describe("formatKeyValue", () => {
    it("formats key-value pair with padding", () => {
      const result = formatKeyValue("Key", "value");
      expect(result).toContain("Key");
      expect(result).toContain("value");
    });
  });

  describe("formatBullet", () => {
    it("neutral tone uses cyan icon", () => {
      expect(formatBullet("item")).toContain("item");
    });

    it("success tone", () => {
      expect(formatBullet("ok", "success")).toContain("ok");
    });

    it("warning tone", () => {
      expect(formatBullet("warn", "warning")).toContain("warn");
    });

    it("danger tone", () => {
      expect(formatBullet("err", "danger")).toContain("err");
    });
  });

  describe("formatMutedPath", () => {
    it("returns dimmed path", () => {
      expect(formatMutedPath("/foo/bar")).toContain("/foo/bar");
    });
  });

  describe("maskSecret", () => {
    it("returns (empty) for empty string", () => {
      expect(maskSecret("")).toBe("(empty)");
    });

    it("returns full value when shorter or equal to visible chars", () => {
      expect(maskSecret("abc123", 8)).toBe("abc123");
    });

    it("masks longer values", () => {
      expect(maskSecret("abcdefghijklmnop", 8)).toBe("abcdefgh…");
    });

    it("uses custom visible length", () => {
      expect(maskSecret("abcdefghij", 4)).toBe("abcd…");
    });
  });

  describe("formatDurationMinutes", () => {
    it("shows minutes when < 60", () => {
      expect(formatDurationMinutes(30)).toBe("30 分钟");
    });

    it("shows hours only for exact multiples of 60", () => {
      expect(formatDurationMinutes(120)).toBe("2 小时");
    });

    it("shows hours and remaining minutes", () => {
      expect(formatDurationMinutes(90)).toBe("1 小时 30 分钟");
    });
  });

  describe("formatStatusBadge", () => {
    it("success tone", () => {
      expect(formatStatusBadge("OK", "success")).toContain("OK");
    });

    it("warning tone", () => {
      expect(formatStatusBadge("Warn", "warning")).toContain("Warn");
    });

    it("danger tone", () => {
      expect(formatStatusBadge("Err", "danger")).toContain("Err");
    });

    it("neutral tone", () => {
      expect(formatStatusBadge("Info", "neutral")).toContain("Info");
    });
  });
});
