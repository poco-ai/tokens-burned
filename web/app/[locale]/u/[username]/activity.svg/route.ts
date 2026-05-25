import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  renderActivityHeatmapSvg,
  resolveActivityHeatmapSvgTheme,
} from "@/lib/social/heatmap-svg";
import { getPublicProfileActivityShareData } from "@/lib/social/queries";

export const revalidate = 3600;

export async function GET(
  request: Request,
  context: { params: Promise<{ locale: string; username: string }> },
) {
  const { locale, username } = await context.params;
  const { searchParams } = new URL(request.url);
  const theme = resolveActivityHeatmapSvgTheme(searchParams.get("theme"));
  const [t, profile] = await Promise.all([
    getTranslations({ locale, namespace: "social.profile" }),
    getPublicProfileActivityShareData({ username }),
  ]);

  if (!profile) {
    notFound();
  }

  const svg = renderActivityHeatmapSvg({
    locale,
    title: t("activityTitle"),
    username: profile.username,
    days: profile.heatmap,
    lessLabel: t("less"),
    moreLabel: t("more"),
    theme,
  });

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control":
        "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
