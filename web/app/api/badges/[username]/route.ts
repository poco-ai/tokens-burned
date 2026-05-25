import { NextResponse } from "next/server";
import { isValidUsername, normalizeUsername } from "@/lib/auth-username";
import {
  getPublicBadgeData,
  parsePublicBadgeMetric,
  parsePublicBadgeStyle,
  parsePublicBadgeTheme,
  renderBadgeSvg,
} from "@/lib/social/badges";

export async function GET(
  request: Request,
  context: RouteContext<"/api/badges/[username]">,
) {
  const { searchParams } = new URL(request.url);
  const metric = parsePublicBadgeMetric(searchParams.get("metric"));

  if (!metric) {
    return NextResponse.json({ error: "INVALID_METRIC" }, { status: 400 });
  }

  const { username: raw } = await context.params;
  const username = normalizeUsername(raw);

  if (!isValidUsername(username)) {
    return NextResponse.json({ error: "INVALID_USERNAME" }, { status: 400 });
  }

  const state = await getPublicBadgeData({ username });
  const svg = renderBadgeSvg(state, {
    metric,
    label: searchParams.get("label"),
    theme: parsePublicBadgeTheme(searchParams.get("theme")),
    style: parsePublicBadgeStyle(searchParams.get("style")),
  });

  return new NextResponse(svg, {
    status: 200,
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}
