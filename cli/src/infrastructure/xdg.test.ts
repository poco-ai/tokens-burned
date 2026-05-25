import { afterEach, describe, expect, it } from "vitest";
import {
  getCacheHome,
  getConfigHome,
  getDataHome,
  getRuntimeDir,
  getStateHome,
} from "./xdg";

describe("xdg", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore env
    for (const key of [
      "XDG_CONFIG_HOME",
      "XDG_DATA_HOME",
      "XDG_CACHE_HOME",
      "XDG_STATE_HOME",
      "XDG_RUNTIME_DIR",
    ]) {
      if (key in originalEnv) {
        process.env[key] = originalEnv[key];
      } else {
        delete process.env[key];
      }
    }
  });

  describe("getConfigHome", () => {
    it("returns env var when set", () => {
      process.env.XDG_CONFIG_HOME = "/tmp/config";
      expect(getConfigHome()).toBe("/tmp/config");
    });

    it("returns default when env var not set", () => {
      delete process.env.XDG_CONFIG_HOME;
      const result = getConfigHome();
      expect(result).toMatch(/\.config$/);
    });
  });

  describe("getDataHome", () => {
    it("returns env var when set", () => {
      process.env.XDG_DATA_HOME = "/tmp/data";
      expect(getDataHome()).toBe("/tmp/data");
    });

    it("returns default when env var not set", () => {
      delete process.env.XDG_DATA_HOME;
      expect(getDataHome()).toMatch(/[/\\]\.local[/\\]share$/);
    });
  });

  describe("getCacheHome", () => {
    it("returns env var when set", () => {
      process.env.XDG_CACHE_HOME = "/tmp/cache";
      expect(getCacheHome()).toBe("/tmp/cache");
    });

    it("returns default when env var not set", () => {
      delete process.env.XDG_CACHE_HOME;
      expect(getCacheHome()).toMatch(/\.cache$/);
    });
  });

  describe("getStateHome", () => {
    it("returns env var when set", () => {
      process.env.XDG_STATE_HOME = "/tmp/state";
      expect(getStateHome()).toBe("/tmp/state");
    });

    it("returns default when env var not set", () => {
      delete process.env.XDG_STATE_HOME;
      expect(getStateHome()).toMatch(/[/\\]\.local[/\\]state$/);
    });
  });

  describe("getRuntimeDir", () => {
    it("returns env var when set", () => {
      process.env.XDG_RUNTIME_DIR = "/tmp/runtime";
      expect(getRuntimeDir()).toBe("/tmp/runtime");
    });

    it("falls back to state home when not set", () => {
      delete process.env.XDG_RUNTIME_DIR;
      delete process.env.XDG_STATE_HOME;
      expect(getRuntimeDir()).toMatch(/[/\\]\.local[/\\]state$/);
    });
  });
});
