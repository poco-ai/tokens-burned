import { z } from "zod";
import {
  buildAbsoluteUrl,
  getAppOrigin,
  resolveAppLocale,
} from "@/lib/site-url";

const ACCESS_TOKEN_TTL_BUFFER_MS = 5 * 60 * 1000;
const DEFAULT_SHARE_TIMEOUT_MS = 30000;

const wechatAccessTokenResponseSchema = z.object({
  access_token: z.string(),
  expires_in: z.number().positive(),
  errcode: z.number().optional(),
  errmsg: z.string().optional(),
});

const wechatTicketResponseSchema = z.object({
  ticket: z.string(),
  errcode: z.number().optional(),
  errmsg: z.string().optional(),
});

const wechatShareSourceSchema = z.enum(["chat", "timeline"]);

export type WechatShareSource = z.infer<typeof wechatShareSourceSchema>;

export const wechatShareTicketRequestSchema = z
  .object({
    source: wechatShareSourceSchema.optional(),
    locale: z.string().optional(),
  })
  .optional();

export type WechatShareTicketPayload = {
  appid: string;
  ticket: string;
  url: string;
  title: string;
  desc: string;
  thumburl: string;
  source: WechatShareSource;
  timeout: number;
};

type AccessTokenCache = {
  value: string;
  expiresAt: number;
};

type WechatAccessTokenResult = {
  accessToken: string;
  expiresAt: number;
};

type FetchLike = typeof fetch;

let accessTokenCache: AccessTokenCache | null = null;
let accessTokenPromise: Promise<WechatAccessTokenResult> | null = null;

function getWechatEnv() {
  const appid = process.env.WECHAT_OPEN_APP_ID?.trim();
  const secret = process.env.WECHAT_OPEN_APP_SECRET?.trim();

  if (!appid || !secret) {
    throw new Error("WECHAT_SHARE_NOT_CONFIGURED");
  }

  return { appid, secret };
}

function readCachedAccessToken(now: number) {
  if (!accessTokenCache) {
    return null;
  }

  if (accessTokenCache.expiresAt <= now + ACCESS_TOKEN_TTL_BUFFER_MS) {
    accessTokenCache = null;
    return null;
  }

  return accessTokenCache.value;
}

export function resetWechatAccessTokenCache() {
  accessTokenCache = null;
  accessTokenPromise = null;
}

export function buildWechatProfileSharePayload(input: {
  appid: string;
  ticket: string;
  locale?: string | null;
  username: string;
  displayName: string;
  bio?: string | null;
  source?: WechatShareSource;
  timeout?: number;
}) {
  const locale = resolveAppLocale(input.locale);
  const url = buildAbsoluteUrl(
    `/${locale}/u/${encodeURIComponent(input.username)}`,
  );
  const thumburl = buildAbsoluteUrl("/logo_green.svg");

  if (!url || !thumburl) {
    throw new Error("APP_ORIGIN_NOT_CONFIGURED");
  }

  const fallbackDescription =
    locale === "zh"
      ? "查看 ta 的 AI 使用数据与活跃记录"
      : "See their AI usage stats and activity on Token Arena.";

  return {
    appid: input.appid,
    ticket: input.ticket,
    url,
    title:
      locale === "zh"
        ? `${input.displayName} 的 Token Arena 主页`
        : `${input.displayName}'s Token Arena profile`,
    desc: input.bio?.trim() || fallbackDescription,
    thumburl,
    source: input.source ?? "chat",
    timeout: input.timeout ?? DEFAULT_SHARE_TIMEOUT_MS,
  } satisfies WechatShareTicketPayload;
}

export async function getWechatAccessToken(fetchImpl: FetchLike = fetch) {
  const now = Date.now();
  const cached = readCachedAccessToken(now);

  if (cached) {
    return cached;
  }

  if (!accessTokenPromise) {
    accessTokenPromise = requestWechatAccessToken(fetchImpl)
      .then((result) => {
        accessTokenCache = {
          value: result.accessToken,
          expiresAt: result.expiresAt,
        };
        return result;
      })
      .finally(() => {
        accessTokenPromise = null;
      });
  }

  const result = await accessTokenPromise;
  return result.accessToken;
}

async function requestWechatAccessToken(fetchImpl: FetchLike) {
  const { appid, secret } = getWechatEnv();
  const searchParams = new URLSearchParams({
    grant_type: "client_credential",
    appid,
    secret,
  });
  const response = await fetchImpl(
    `https://api.weixin.qq.com/cgi-bin/token?${searchParams.toString()}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`WECHAT_ACCESS_TOKEN_HTTP_${response.status}`);
  }

  const parsed = wechatAccessTokenResponseSchema.parse(await response.json());

  if (!parsed.access_token) {
    throw new Error(parsed.errmsg || "WECHAT_ACCESS_TOKEN_FAILED");
  }

  return {
    accessToken: parsed.access_token,
    expiresAt: Date.now() + parsed.expires_in * 1000,
  } satisfies WechatAccessTokenResult;
}

async function createWechatPcOpenSdkTicket(fetchImpl: FetchLike = fetch) {
  const accessToken = await getWechatAccessToken(fetchImpl);
  const response = await fetchImpl(
    `https://api.weixin.qq.com/cgi-bin/pcopensdk/ticket?access_token=${encodeURIComponent(accessToken)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ticket_type: "pcopensdk" }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`WECHAT_TICKET_HTTP_${response.status}`);
  }

  const parsed = wechatTicketResponseSchema.parse(await response.json());

  if (!parsed.ticket) {
    throw new Error(parsed.errmsg || "WECHAT_TICKET_FAILED");
  }

  return parsed.ticket;
}

export async function createWechatProfileShareTicketPayload(
  input: {
    username: string;
    displayName: string;
    bio?: string | null;
    locale?: string | null;
    source?: WechatShareSource;
  },
  fetchImpl: FetchLike = fetch,
) {
  const { appid } = getWechatEnv();
  const ticket = await createWechatPcOpenSdkTicket(fetchImpl);

  return buildWechatProfileSharePayload({
    appid,
    ticket,
    username: input.username,
    displayName: input.displayName,
    bio: input.bio,
    locale: input.locale,
    source: input.source,
  });
}

export function isWechatShareConfigured() {
  return Boolean(
    process.env.WECHAT_OPEN_APP_ID?.trim() &&
      process.env.WECHAT_OPEN_APP_SECRET?.trim() &&
      getAppOrigin(),
  );
}
