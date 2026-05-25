import { afterEach, describe, expect, it, vi } from "vitest";
import { Logger } from "./logger";

describe("Logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("defaults to info level", () => {
    const log = new Logger();
    const stdoutSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    const stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    log.debug("should not appear");
    expect(stdoutSpy).not.toHaveBeenCalled();
    expect(stderrSpy).not.toHaveBeenCalled();
  });

  it("setLevel changes level", () => {
    const log = new Logger();
    log.setLevel("debug");

    const stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    log.debug("debug-msg");
    expect(stderrSpy).toHaveBeenCalledWith("[debug] debug-msg\n");
  });

  it("info writes to stdout", () => {
    const log = new Logger("info");
    const spy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    log.info("hello");
    expect(spy).toHaveBeenCalledWith("hello\n");
  });

  it("warn writes to stderr", () => {
    const log = new Logger("warn");
    const spy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    log.warn("warning");
    expect(spy).toHaveBeenCalledWith("warn: warning\n");
  });

  it("error writes to stderr", () => {
    const log = new Logger("error");
    const spy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    log.error("fail");
    expect(spy).toHaveBeenCalledWith("error: fail\n");
  });

  it("log delegates to info", () => {
    const log = new Logger("info");
    const spy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    log.log("test");
    expect(spy).toHaveBeenCalledWith("test\n");
  });

  it("filters out debug/info when set to warn", () => {
    const log = new Logger("warn");
    const stdoutSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    const stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    log.debug("no");
    log.info("no");
    expect(stdoutSpy).not.toHaveBeenCalled();

    log.warn("yes");
    expect(stderrSpy).toHaveBeenCalledTimes(1);
  });
});
