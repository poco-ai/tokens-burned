import { NextResponse } from "next/server";

import { findUsageApiKeyByRaw } from "@/lib/usage/api-keys";
import { ingestRequestSchema } from "@/lib/usage/contracts";
import { ingestUsagePayload } from "@/lib/usage/ingest";

function getBearerToken(request: Request) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
}

export async function POST(request: Request) {
  const rawKey = getBearerToken(request);

  if (!rawKey) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const apiKey = await findUsageApiKeyByRaw(rawKey);

  if (!apiKey) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const parsed = ingestRequestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "INVALID_PAYLOAD",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const result = await ingestUsagePayload({
    userId: apiKey.userId,
    apiKeyId: apiKey.id,
    payload: parsed.data,
  });

  return NextResponse.json(result);
}
