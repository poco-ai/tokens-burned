"use client";

import type { ProjectMode } from "@/lib/usage/types";

export const preferenceNoticeEventName = "tokenarena:preference-notice";

export type PreferenceNoticeSnapshot = {
  timezone: string;
  projectMode: ProjectMode;
  publicProfileEnabled: boolean;
  bio: string | null;
};

export type PreferenceNoticeDetail = {
  type: "saved";
  preference: PreferenceNoticeSnapshot;
};

export function emitPreferenceSavedNotice(
  preference: PreferenceNoticeSnapshot,
) {
  window.dispatchEvent(
    new CustomEvent<PreferenceNoticeDetail>(preferenceNoticeEventName, {
      detail: { type: "saved", preference },
    }),
  );
}
