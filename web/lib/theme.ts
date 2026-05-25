export const themeModes = ["light", "dark", "system"] as const;

export type ThemeMode = (typeof themeModes)[number];
export type ThemeAppearance = Exclude<ThemeMode, "system">;

export const defaultThemeMode: ThemeMode = "system";
export const themeCookieName = "tb-theme";
export const themeStorageKey = "tb-theme";

function isThemeMode(value: string): value is ThemeMode {
  return themeModes.includes(value as ThemeMode);
}

export function getThemeMode(value: string | null | undefined): ThemeMode {
  return value && isThemeMode(value) ? value : defaultThemeMode;
}

export function resolveThemeAppearance(
  themeMode: ThemeMode,
  systemPrefersDark: boolean,
): ThemeAppearance {
  if (themeMode === "system") {
    return systemPrefersDark ? "dark" : "light";
  }

  return themeMode;
}
