import Script from "next/script";
import { defaultThemeMode, type ThemeMode, themeStorageKey } from "@/lib/theme";

type ThemeScriptProps = {
  initialThemeMode: ThemeMode;
};

export function ThemeScript({ initialThemeMode }: ThemeScriptProps) {
  const script = `
(() => {
  const storedTheme = window.localStorage.getItem(${JSON.stringify(themeStorageKey)});
  const theme = ["light", "dark", "system"].includes(storedTheme ?? "")
    ? storedTheme
    : ${JSON.stringify(initialThemeMode ?? defaultThemeMode)};
  const resolvedTheme = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
    ? "dark"
    : "light";

  document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  document.documentElement.dataset.themeMode = theme;
  document.documentElement.style.colorScheme = resolvedTheme;
})();
`;

  return (
    <Script id="tokenarena-theme-init" suppressHydrationWarning>
      {script}
    </Script>
  );
}
