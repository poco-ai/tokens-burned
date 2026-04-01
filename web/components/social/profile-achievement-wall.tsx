"use client";

import { useTranslations } from "next-intl";
import { AchievementBadge } from "@/components/achievements/achievement-badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ProfileAchievementWallItem } from "@/lib/achievements/profile-wall";

type ProfileAchievementWallProps = {
  items: ProfileAchievementWallItem[];
};

export function ProfileAchievementWall({ items }: ProfileAchievementWallProps) {
  const t = useTranslations("achievements.items");

  if (items.length === 0) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={250}>
      <ul className="grid w-full grid-cols-5 gap-1.5">
        {items.map((item) => (
          <li key={item.code} className="flex min-w-0 justify-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex cursor-default">
                  <AchievementBadge
                    iconKey={item.iconKey}
                    tier={item.tier}
                    size="xs"
                    count={item.awardCount > 1 ? item.awardCount : 0}
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                sideOffset={6}
                className="max-w-[min(280px,calc(100vw-1.5rem))] flex-col items-start gap-1 px-3 py-2 text-left"
              >
                <span className="block font-medium leading-tight">
                  {t(`${item.code}.title` as Parameters<typeof t>[0])}
                </span>
                <span className="block text-[11px] leading-snug text-background/85">
                  {t(`${item.code}.description` as Parameters<typeof t>[0])}
                </span>
              </TooltipContent>
            </Tooltip>
          </li>
        ))}
      </ul>
    </TooltipProvider>
  );
}
