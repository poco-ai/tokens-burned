"use client";

import { Monitor, MoonStar, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "@/components/providers/theme-provider";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { persistServerPreference } from "@/lib/preferences-client";
import type { ThemeMode } from "@/lib/theme";
import { cn } from "@/lib/utils";

type ThemeSwitcherProps = {
  authenticated?: boolean;
  variant?: "default" | "compact";
};

const themeIcons = {
  light: Sun,
  dark: MoonStar,
  system: Monitor,
} satisfies Record<ThemeMode, typeof Sun>;

export function ThemeSwitcher({
  authenticated = false,
  variant = "default",
}: ThemeSwitcherProps) {
  const t = useTranslations("common");
  const { resolvedTheme, themeMode, setThemeMode } = useTheme();
  const compact = variant === "compact";
  const nextThemeMode = resolvedTheme === "dark" ? "light" : "dark";
  const CompactThemeIcon = nextThemeMode === "dark" ? MoonStar : Sun;

  const handleChange = (nextThemeMode: ThemeMode) => {
    setThemeMode(nextThemeMode);

    if (authenticated) {
      void persistServerPreference({ theme: nextThemeMode }).catch(
        console.error,
      );
    }
  };

  if (compact) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`${t("theme")}: ${t(`themes.${nextThemeMode}`)}`}
        title={t(`themes.${nextThemeMode}`)}
        onClick={() => handleChange(nextThemeMode)}
      >
        <CompactThemeIcon className="size-3.5" />
      </Button>
    );
  }

  return (
    <Select
      value={themeMode}
      onValueChange={(value) => handleChange(value as ThemeMode)}
    >
      <SelectTrigger
        aria-label={t("theme")}
        size="default"
        className={cn("h-8 w-[112px] bg-background")}
      >
        <SelectValue placeholder={t("theme")} />
      </SelectTrigger>
      <SelectContent align="center">
        <SelectItem value="light">{t("themes.light")}</SelectItem>
        <SelectItem value="dark">{t("themes.dark")}</SelectItem>
        <SelectItem value="system">{t("themes.system")}</SelectItem>
      </SelectContent>
    </Select>
  );
}
