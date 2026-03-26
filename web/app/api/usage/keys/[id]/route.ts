import { NextResponse } from "next/server";

import { getOptionalSession } from "@/lib/session";
import { deleteUsageApiKey, updateUsageApiKey } from "@/lib/usage/api-keys";
import { usageKeyUpdateSchema } from "@/lib/usage/contracts";

async function getSessionUserId() {
  const session = await getOptionalSession();

  return session?.user.id ?? null;
}

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/usage/keys/[id]">,
) {
  const userId = await getSessionUserId();

  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = usageKeyUpdateSchema.parse(await request.json());
  const key = await updateUsageApiKey(userId, id, body);

  if (!key) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ key });
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/usage/keys/[id]">,
) {
  const userId = await getSessionUserId();

  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await context.params;
  const deleted = await deleteUsageApiKey(userId, id);

  if (!deleted) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
