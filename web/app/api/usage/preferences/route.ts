import { NextResponse } from "next/server";

import { getOptionalSession } from "@/lib/session";
import { usagePreferenceUpdateSchema } from "@/lib/usage/contracts";
import {
  getUsagePreference,
  updateUsagePreference,
} from "@/lib/usage/preferences";

async function getSessionUserId() {
  const session = await getOptionalSession();

  return session?.user.id ?? null;
}

export async function GET() {
  const userId = await getSessionUserId();

  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const preference = await getUsagePreference(userId);

  return NextResponse.json({
    timezone: preference.timezone,
    projectMode: preference.projectMode,
  });
}

export async function PATCH(request: Request) {
  const userId = await getSessionUserId();

  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = usagePreferenceUpdateSchema.parse(await request.json());
  const preference = await updateUsagePreference(userId, body);

  return NextResponse.json({
    timezone: preference.timezone,
    projectMode: preference.projectMode,
  });
}
