"use client";

import { useEffect } from "react";

import type {
  UsageShareCardData,
  UsageShareCardTemplate,
} from "@/lib/usage/share-card";
import {
  UsageShareCardPreview,
  type UsageShareCardPrivacy,
} from "./share-card-preview";

type UsageShareCardPreviewLoaderProps = {
  data: UsageShareCardData;
  template: UsageShareCardTemplate;
  privacy: UsageShareCardPrivacy;
  locale: string;
  size?: "preview" | "export";
  className?: string;
  onReady?: () => void;
};

export function UsageShareCardPreviewLoader({
  onReady,
  ...props
}: UsageShareCardPreviewLoaderProps) {
  useEffect(() => {
    onReady?.();
  }, [onReady]);

  return <UsageShareCardPreview {...props} />;
}
