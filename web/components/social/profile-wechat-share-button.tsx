"use client";

import { Copy, LoaderCircle, Share2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { RiWechatFill } from "react-icons/ri";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getWechatShareRequestBody,
  getWechatShareSupport,
  mapWechatShareErrorCode,
  shareLinkToWechat,
} from "@/lib/wechat/pc-opensdk";
import type {
  WechatShareSource,
  WechatShareTicketPayload,
} from "@/lib/wechat/share-server";

const MIN_ACTION_GAP_MS = 1000;

type ProfileWechatShareButtonProps = {
  shareUrl: string;
};

export function ProfileWechatShareButton({
  shareUrl,
}: ProfileWechatShareButtonProps) {
  const locale = useLocale();
  const t = useTranslations("social.profile.wechatShare");
  const lastAttemptRef = useRef(0);
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const getSupport = () => {
    if (typeof window === "undefined") {
      return {
        supported: false,
        sdkLoaded: false,
        isHttps: false,
        isLocalhost: false,
        locale,
      } as const;
    }

    return getWechatShareSupport({
      locale,
      sdkLoaded: Boolean(window.wxopensdk),
      protocol: window.location.protocol,
      hostname: window.location.hostname,
    });
  };

  const support = getSupport();

  const withRateLimitGuard = async <T,>(action: () => Promise<T>) => {
    const now = Date.now();

    if (now - lastAttemptRef.current < MIN_ACTION_GAP_MS) {
      toast.info(t("rateLimited"));
      return null;
    }

    lastAttemptRef.current = now;
    return action();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(t("copySuccess"));
    } catch {
      toast.error(t("copyFailed"));
    }
  };

  const handleWechatShare = async (source: WechatShareSource) => {
    if (isPending) {
      return;
    }

    await withRateLimitGuard(async () => {
      startTransition(async () => {
        try {
          const currentSupport = getSupport();

          if (!currentSupport.isHttps) {
            toast.info(t("httpsRequired"));
            return;
          }

          if (!currentSupport.sdkLoaded) {
            await handleCopyLink();
            toast.info(t("desktopOnly"));
            return;
          }

          const response = await fetch(
            "/api/integrations/wechat/share-ticket",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(
                getWechatShareRequestBody({
                  source,
                  locale,
                }),
              ),
            },
          );

          if (!response.ok) {
            const payload = (await response.json().catch(() => null)) as {
              error?: string;
            } | null;

            if (payload?.error === "PROFILE_PRIVATE") {
              toast.info(t("profilePrivate"));
              return;
            }

            if (payload?.error === "WECHAT_SHARE_NOT_CONFIGURED") {
              toast.info(t("desktopOnly"));
              return;
            }

            throw new Error(payload?.error || "SHARE_TICKET_FAILED");
          }

          const payload = (await response.json()) as WechatShareTicketPayload;
          const result = await shareLinkToWechat(payload);

          if (result.errcode === 0) {
            toast.success(
              source === "chat" ? t("friendSuccess") : t("timelineSuccess"),
            );
            return;
          }

          toast.error(mapWechatShareErrorCode(result.errcode, locale), {
            description: result.errmsg,
          });
        } catch (error) {
          toast.error(t("failed"), {
            description:
              error instanceof Error && error.message
                ? error.message
                : t("desktopOnly"),
          });
        }
      });
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={isPending}
        >
          {isPending ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <RiWechatFill className="size-4" />
          )}
          {t("button")}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <PopoverHeader>
          <PopoverTitle>{t("button")}</PopoverTitle>
          <PopoverDescription>
            {support.supported ? t("description") : t("desktopOnly")}
          </PopoverDescription>
        </PopoverHeader>

        <div className="grid gap-2">
          <Button
            type="button"
            className="justify-start"
            onClick={() => void handleWechatShare("chat")}
            disabled={isPending}
          >
            <RiWechatFill className="size-4" />
            {t("sendToFriend")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="justify-start"
            onClick={() => void handleWechatShare("timeline")}
            disabled={isPending}
          >
            <Share2 />
            {t("shareToTimeline")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="justify-start"
            onClick={() => void handleCopyLink()}
            disabled={isPending}
          >
            <Copy />
            {t("copyLink")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
