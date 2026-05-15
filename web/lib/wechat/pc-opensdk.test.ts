import { describe, expect, it } from "vitest";
import {
  getWechatShareRequestBody,
  getWechatShareSupport,
  mapWechatShareErrorCode,
} from "./pc-opensdk";

describe("pc opensdk helpers", () => {
  it("detects https sdk support", () => {
    expect(
      getWechatShareSupport({
        locale: "zh",
        sdkLoaded: true,
        protocol: "https:",
        hostname: "tokenarena.example",
      }),
    ).toMatchObject({
      locale: "zh",
      isHttps: true,
      sdkLoaded: true,
      supported: true,
    });
  });

  it("maps common error codes to localized messages", () => {
    expect(mapWechatShareErrorCode(-11033, "zh")).toContain("HTTPS");
    expect(mapWechatShareErrorCode(-11036, "en")).toContain("PC WeChat");
  });

  it("detects localhost hostname as not a production host", () => {
    const localhost = getWechatShareSupport({
      locale: "en",
      sdkLoaded: true,
      protocol: "https:",
      hostname: "localhost",
    });
    expect(localhost.isLocalhost).toBe(true);
    expect(localhost.isHttps).toBe(true);

    const loopback = getWechatShareSupport({
      locale: "en",
      sdkLoaded: true,
      protocol: "https:",
      hostname: "127.0.0.1",
    });
    expect(loopback.isLocalhost).toBe(true);

    const normal = getWechatShareSupport({
      locale: "en",
      sdkLoaded: true,
      protocol: "https:",
      hostname: "tokenarena.example",
    });
    expect(normal.isLocalhost).toBe(false);
  });

  it("reports non-HTTPS protocol as not supported", () => {
    const result = getWechatShareSupport({
      locale: "en",
      sdkLoaded: true,
      protocol: "http:",
      hostname: "tokenarena.example",
    });
    expect(result.isHttps).toBe(false);
    expect(result.supported).toBe(false);
  });

  it("reports sdkLoaded=false as not supported", () => {
    const result = getWechatShareSupport({
      locale: "en",
      sdkLoaded: false,
      protocol: "https:",
      hostname: "tokenarena.example",
    });
    expect(result.sdkLoaded).toBe(false);
    expect(result.supported).toBe(false);
  });

  it("maps additional error codes and unknown codes", () => {
    expect(mapWechatShareErrorCode(-11034, "en")).toContain(
      "does not have WeChat share permission",
    );
    expect(mapWechatShareErrorCode(-11034, "zh")).toContain("分享权限");

    expect(mapWechatShareErrorCode(-11032, "en")).toContain("not registered");
    expect(mapWechatShareErrorCode(-11032, "zh")).toContain("域名");

    expect(mapWechatShareErrorCode(-11037, "en")).toBe(
      "WeChat share failed. Please try again.",
    );
    expect(mapWechatShareErrorCode(-11037, "zh")).toBe(
      "微信分享失败，请稍后重试。",
    );

    expect(mapWechatShareErrorCode(0, "en")).toBe(
      "WeChat share failed. Please try again.",
    );
  });

  it("getWechatShareRequestBody returns source and locale", () => {
    const body = getWechatShareRequestBody({
      source: "profile_page",
      locale: "zh",
    });
    expect(body).toEqual({ source: "profile_page", locale: "zh" });
  });
});
