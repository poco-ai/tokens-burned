import type { LucideIcon } from "lucide-react";
import {
  Brain,
  CalendarCheck2,
  Clock3,
  Coins,
  DatabaseZap,
  Flame,
  Focus,
  FolderGit2,
  HeartHandshake,
  Lock,
  MessagesSquare,
  MonitorSmartphone,
  Orbit,
  Rocket,
  Sparkles,
  Target,
  Trophy,
  UserPlus,
  Users,
  Wrench,
} from "lucide-react";
import type {
  AchievementIconKey,
  AchievementTier,
} from "@/lib/achievements/types";
import { cn } from "@/lib/utils";

const GARMIN_HEXAGON_CLIP_PATH =
  "polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)";

const iconMap: Record<AchievementIconKey, LucideIcon> = {
  rocket: Rocket,
  flame: Flame,
  "calendar-check": CalendarCheck2,
  coins: Coins,
  "messages-square": MessagesSquare,
  clock: Clock3,
  brain: Brain,
  "database-zap": DatabaseZap,
  focus: Focus,
  orbit: Orbit,
  wrench: Wrench,
  "folder-git": FolderGit2,
  "monitor-smartphone": MonitorSmartphone,
  "user-plus": UserPlus,
  "heart-handshake": HeartHandshake,
  users: Users,
  sparkles: Sparkles,
  trophy: Trophy,
  target: Target,
};

const tierClassNames: Record<AchievementTier, string> = {
  bronze: "from-amber-300 via-orange-300 to-amber-500 text-amber-950",
  silver: "from-slate-200 via-zinc-100 to-slate-300 text-slate-900",
  gold: "from-yellow-200 via-amber-100 to-yellow-400 text-amber-950",
  special: "from-fuchsia-300 via-violet-200 to-indigo-400 text-indigo-950",
};

const lockedShellClassNames =
  "from-zinc-700 via-zinc-800 to-zinc-900 text-zinc-300 dark:from-zinc-800 dark:via-zinc-900 dark:to-black dark:text-zinc-400";

type AchievementBadgeProps = {
  iconKey: AchievementIconKey;
  tier: AchievementTier;
  locked?: boolean;
  size?: "sm" | "md" | "lg";
};

const sizeClassNames = {
  sm: {
    shell: "size-12",
    icon: "size-4",
    lockIcon: "size-5",
    watermarkIcon: "size-4.5",
  },
  md: {
    shell: "size-15",
    icon: "size-5",
    lockIcon: "size-6",
    watermarkIcon: "size-6",
  },
  lg: {
    shell: "size-18",
    icon: "size-6",
    lockIcon: "size-7",
    watermarkIcon: "size-7",
  },
} as const;

export function AchievementBadge({
  iconKey,
  tier,
  locked = false,
  size = "md",
}: AchievementBadgeProps) {
  const Icon = iconMap[iconKey];
  const classes = sizeClassNames[size];

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        locked && "grayscale saturate-0",
      )}
    >
      <div
        className={cn(
          "relative grid place-items-center border-0 bg-gradient-to-br shadow-none ring-0",
          locked ? lockedShellClassNames : tierClassNames[tier],
          classes.shell,
        )}
        style={{ clipPath: GARMIN_HEXAGON_CLIP_PATH }}
      >
        {locked ? (
          <>
            <div
              className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.14)_52%,rgba(39,39,42,0.18)_52%,rgba(24,24,27,0.42)_100%)]"
              style={{ clipPath: GARMIN_HEXAGON_CLIP_PATH }}
            />
            <Icon
              className={cn(
                "absolute bottom-[12%] z-[1] opacity-8 blur-[2px]",
                classes.watermarkIcon,
              )}
              strokeWidth={2.1}
            />
            <Lock
              className={cn(
                "relative z-10 text-white drop-shadow-sm",
                classes.lockIcon,
              )}
              strokeWidth={2.4}
            />
          </>
        ) : (
          <>
            <div
              className="absolute inset-0 grid place-items-center backdrop-blur-[2px] bg-[linear-gradient(180deg,rgba(255,255,255,0.28),rgba(255,255,255,0.1))] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(15,23,42,0.14))]"
              style={{ clipPath: GARMIN_HEXAGON_CLIP_PATH }}
            />
            <Icon
              className={cn(
                "relative z-10 opacity-95 drop-shadow-[0_1px_1px_rgba(255,255,255,0.18)]",
                classes.icon,
              )}
              strokeWidth={2.2}
            />
          </>
        )}
      </div>
    </div>
  );
}
