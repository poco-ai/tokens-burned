import { describe, expect, it } from "vitest";
import { buildLaunchAgentPlist, buildServiceWrapperScript } from "./launchd";

describe("buildServiceWrapperScript", () => {
  it("builds a shell wrapper that runs sync in service mode", () => {
    const script = buildServiceWrapperScript({
      args: ["/tmp/dist/index.js"],
      program: "/usr/local/bin/node",
      workingDirectory: "/tmp/project",
    });

    expect(script).toContain("#!/bin/sh");
    expect(script).toContain("sync --quiet --service-mode");
    expect(script).toContain("cd '/tmp/project'");
    expect(script).toContain("exec '/usr/local/bin/node' '/tmp/dist/index.js'");
  });
});

describe("buildLaunchAgentPlist", () => {
  it("renders a launchd plist with the expected schedule and paths", () => {
    const plist = buildLaunchAgentPlist({
      intervalSeconds: 300,
      label: "ai.poco.tokens-burned.sync",
      logPath: "/tmp/service.log",
      workingDirectory: "/tmp/project",
      wrapperPath: "/tmp/run-sync-service.sh",
    });

    expect(plist).toContain("<key>StartInterval</key>");
    expect(plist).toContain("<integer>300</integer>");
    expect(plist).toContain("<string>/tmp/run-sync-service.sh</string>");
    expect(plist).toContain("<string>/tmp/service.log</string>");
  });

  it("escapes xml special characters in paths", () => {
    const plist = buildLaunchAgentPlist({
      intervalSeconds: 300,
      label: "ai.poco.tokens-burned.sync",
      logPath: "/tmp/a&b.log",
      workingDirectory: "/tmp/work<'dir'>",
      wrapperPath: "/tmp/run<&>.sh",
    });

    expect(plist).toContain("/tmp/a&amp;b.log");
    expect(plist).toContain("/tmp/work&lt;&apos;dir&apos;&gt;");
    expect(plist).toContain("/tmp/run&lt;&amp;&gt;.sh");
  });
});
