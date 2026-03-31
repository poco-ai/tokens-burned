import { NextResponse } from "next/server";
import { getAchievementNotificationData } from "@/lib/achievements/queries";
import { getOptionalSession } from "@/lib/session";

export async function GET() {
  const session = await getOptionalSession();

  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const data = await getAchievementNotificationData(session.user.id);
  return NextResponse.json(data);
}
