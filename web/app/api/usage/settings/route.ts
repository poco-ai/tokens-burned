import { NextResponse } from "next/server";

import { findUsageApiKeyByRaw } from "@/lib/usage/api-keys";
import { getUsagePreference } from "@/lib/usage/preferences";
import { schemaVersion } from "@/lib/usage/types";

function getBearerToken(request: Request) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
}

export async function GET(request: Request) {
  const rawKey = getBearerToken(request);

  if (!rawKey) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const apiKey = await findUsageApiKeyByRaw(rawKey);

  if (!apiKey) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const preference = await getUsagePreference(apiKey.userId);

  return NextResponse.json({
    schemaVersion,
    projectMode: preference.projectMode,
    projectHashSalt: preference.projectHashSalt,
    timezone: preference.timezone,
  });
}
