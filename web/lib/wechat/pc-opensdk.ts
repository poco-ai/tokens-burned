import { isSupportedLocale, normalizeLocale } from "@/lib/i18n";
import type {
  WechatShareSource,
  WechatShareTicketPayload,
} from "./share-server";

type WechatOpenSdkResult = {
  errcode: number;
  errmsg: string;
  actionId?: string;
};

type WechatOpenSdk = {
  ready?: boolean;
  onReady?: (() => void) | null;
  shareLink: (
    payload: WechatShareTicketPayload,
  ) => Promise<WechatOpenSdkResult>;
};

declare global {
  interface Window {
    wxopensdk?: WechatOpenSdk;
  }
}

const WECHAT_ERROR_MESSAGES: Record<number, string> = {
  [-11032]: "domain",
  [-11033]: "https",
  [-11034]: "permission",
  [-11036]: "version",
};

export function getWechatShareSupport(input: {
  locale?: string | null;
  sdkLoaded?: boolean;
  protocol?: string | null;
  hostname?: string | null;
}) {
  const locale = normalizeLocale(input.locale) ?? "en";
  const isHttps = input.protocol === "https:";
  const sdkLoaded = Boolean(input.sdkLoaded);
  const isLocalhost =
    input.hostname === "localhost" || input.hostname === "127.0.0.1";

  return {
    locale,
    isHttps,
    sdkLoaded,
    isLocalhost,
    supported: sdkLoaded && isHttps,
  } as const;
}

async function waitForWechatOpenSdk(timeoutMs = 5000) {
  if (typeof window === "undefined") {
    throw new Error("unsupported");
  }

  if (window.wxopensdk?.ready) {
    return window.wxopensdk;
  }

  if (!window.wxopensdk) {
    throw new Error("unsupported");
  }

  await new Promise<void>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error("timeout"));
    }, timeoutMs);

    const sdk = window.wxopensdk;

    if (!sdk) {
      window.clearTimeout(timeoutId);
      reject(new Error("unsupported"));
      return;
    }

    const previousOnReady = sdk.onReady;
    sdk.onReady = () => {
      previousOnReady?.();
      window.clearTimeout(timeoutId);
      resolve();
    };
  });

  if (!window.wxopensdk) {
    throw new Error("unsupported");
  }

  return window.wxopensdk;
}

export async function shareLinkToWechat(payload: WechatShareTicketPayload) {
  const sdk = await waitForWechatOpenSdk();
  return sdk.shareLink(payload);
}

export function mapWechatShareErrorCode(
  errcode: number,
  locale: string,
): string {
  const normalizedLocale = isSupportedLocale(locale) ? locale : "en";
  const reason = WECHAT_ERROR_MESSAGES[errcode];

  if (!reason) {
    return normalizedLocale === "zh"
      ? "微信分享失败，请稍后重试。"
      : "WeChat share failed. Please try again.";
  }

  const zhMessages: Record<string, string> = {
    domain: "当前域名未在微信开放平台登记，无法发起分享。",
    https: "微信分享仅支持 HTTPS 页面。",
    permission: "当前网站应用还未开通微信分享权限。",
    version: "当前 PC 微信版本不支持该分享能力。",
  };
  const enMessages: Record<string, string> = {
    domain: "This domain is not registered in the WeChat open platform.",
    https: "WeChat sharing requires an HTTPS page.",
    permission: "This app does not have WeChat share permission yet.",
    version:
      "The current PC WeChat version does not support this share action.",
  };

  return normalizedLocale === "zh" ? zhMessages[reason] : enMessages[reason];
}

export function getWechatShareRequestBody(input: {
  source: WechatShareSource;
  locale: string;
}) {
  return {
    source: input.source,
    locale: input.locale,
  };
}
