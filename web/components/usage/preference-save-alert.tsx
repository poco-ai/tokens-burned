"use client";

import { CheckCircle2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useReducer, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  type PreferenceNoticeDetail,
  preferenceNoticeEventName,
} from "@/lib/usage/preference-notice";

const dismissDelayMs = 2500;

export function PreferenceSaveAlert() {
  const t = useTranslations("usage.settings");

  const [state, dispatch] = useReducer(
    (
      _prev: { visible: boolean },
      action: { type: "show" } | { type: "hide" },
    ) => ({
      visible: action.type === "show",
    }),
    { visible: false },
  );

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleNotice = (event: Event) => {
      const customEvent = event as CustomEvent<PreferenceNoticeDetail>;

      if (customEvent.detail.type !== "saved") {
        return;
      }

      dispatch({ type: "show" });

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        dispatch({ type: "hide" });
        timeoutRef.current = null;
      }, dismissDelayMs);
    };

    window.addEventListener(
      preferenceNoticeEventName,
      handleNotice as EventListener,
    );

    return () => {
      window.removeEventListener(
        preferenceNoticeEventName,
        handleNotice as EventListener,
      );

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!state.visible) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex justify-center px-4">
      <div
        role="alert"
        className="pointer-events-auto inline-flex max-w-full items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/95 px-3 py-2 text-sm whitespace-nowrap text-emerald-950 shadow-lg animate-in fade-in-0 slide-in-from-top-2 dark:border-emerald-900/60 dark:bg-emerald-950/90 dark:text-emerald-50"
      >
        <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <span className="truncate">{t("saveAlertTitle")}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="-mr-1 shrink-0 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-900 dark:text-emerald-200 dark:hover:bg-emerald-900/50"
          aria-label={t("dismissSaveAlert")}
          onClick={() => {
            dispatch({ type: "hide" });
          }}
        >
          <X className="size-3" />
        </Button>
      </div>
    </div>
  );
}
