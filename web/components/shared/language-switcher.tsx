"use client";

import { Check, Languages } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/lib/i18n";
import {
  persistClientLocale,
  persistServerPreference,
} from "@/lib/preferences-client";
import { cn, FOOTER_ICON_BUTTON_CLASS } from "@/lib/utils";

const locales: AppLocale[] = ["en", "zh"];

type LanguageSwitcherProps = {
  authenticated?: boolean;
  variant?: "default" | "compact" | "icon";
  /** Circular neutral icon button for dark footer. */
  footerIcon?: boolean;
};

function LanguageSwitcherInner({
  authenticated = false,
  variant = "default",
  footerIcon = false,
}: LanguageSwitcherProps) {
  const t = useTranslations("common");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const { replace } = useRouter();
  const searchParams = useSearchParams();
  const compact = variant === "compact";

  const [open, setOpen] = useState(false);

  const handleChange = (nextLocale: AppLocale) => {
    if (nextLocale === locale) {
      setOpen(false);
      return;
    }

    void persistClientLocale(nextLocale);

    if (authenticated) {
      void persistServerPreference({ locale: nextLocale }).catch(console.error);
    }

    const query = Object.fromEntries(searchParams.entries());
    const href = Object.keys(query).length > 0 ? { pathname, query } : pathname;

    replace(href, { locale: nextLocale });
    setOpen(false);
  };

  if (variant === "icon") {
    const iconButtonClass = footerIcon
      ? FOOTER_ICON_BUTTON_CLASS
      : "rounded-full hover:bg-muted/70 dark:hover:bg-muted/45";

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size={footerIcon ? "icon" : "icon-sm"}
            className={iconButtonClass}
            aria-label={t("language")}
            aria-expanded={open}
          >
            <Languages className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          side="top"
          sideOffset={8}
          className="w-auto min-w-[10rem] p-1"
        >
          <div className="flex flex-col gap-0.5" role="listbox">
            {locales.map((code) => (
              <button
                key={code}
                type="button"
                role="option"
                aria-selected={locale === code}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground",
                  locale === code && "bg-accent/60",
                )}
                onClick={() => handleChange(code)}
              >
                <span>{t(`languages.${code}`)}</span>
                {locale === code ? (
                  <Check className="size-4 shrink-0 opacity-80" />
                ) : (
                  <span className="size-4 shrink-0" aria-hidden />
                )}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  if (compact) {
    const nextLocale = locale === "en" ? "zh" : "en";

    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label={`${t("language")}: ${t(`languages.${nextLocale}`)}`}
        title={t(`languages.${nextLocale}`)}
        onClick={() => handleChange(nextLocale)}
      >
        {nextLocale === "en" ? "EN" : "中"}
      </Button>
    );
  }

  return (
    <Select
      value={locale}
      onValueChange={(value) => handleChange(value as AppLocale)}
    >
      <SelectTrigger
        aria-label={t("language")}
        size="default"
        className={cn("h-8 w-[104px] bg-background")}
      >
        <SelectValue placeholder={t("language")} />
      </SelectTrigger>
      <SelectContent align="center">
        <SelectItem value="en">{t("languages.en")}</SelectItem>
        <SelectItem value="zh">{t("languages.zh")}</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function LanguageSwitcher(props: LanguageSwitcherProps) {
  return (
    <Suspense fallback={null}>
      <LanguageSwitcherInner {...props} />
    </Suspense>
  );
}
