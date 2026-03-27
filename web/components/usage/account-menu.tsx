"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

import { LogoutButton } from "@/components/auth/logout-button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Link } from "@/i18n/navigation";

type AccountMenuProps = {
  email: string;
  username?: string | null;
};

function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || "?";
}

export function AccountMenu({ email, username }: AccountMenuProps) {
  const t = useTranslations("common");
  const tUsage = useTranslations("usage.accountMenu");
  const tSocial = useTranslations("social.nav");
  const identity = username ?? email;
  const links = username
    ? [
        { href: `/u/${username}`, label: tSocial("profile") },
        { href: "/people", label: tSocial("people") },
        { href: "/following", label: tSocial("following") },
        { href: "/followers", label: tSocial("followers") },
        { href: "/usage", label: tSocial("dashboard") },
      ]
    : [];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1 rounded-full border bg-background px-1.5 pr-2 text-sm font-medium text-foreground ring-1 ring-foreground/10 transition-colors hover:bg-muted"
          aria-label={tUsage("open")}
        >
          <span className="inline-flex size-5 items-center justify-center rounded-full bg-foreground text-[0.7rem] font-semibold text-background">
            {getInitial(identity)}
          </span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-1.5">
        <div className="space-y-3">
          <div className="rounded-lg px-2 py-1.5">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("account")}
            </div>
            {username ? (
              <div className="mt-1 text-sm font-semibold">@{username}</div>
            ) : null}
            <div className="mt-1 break-all text-sm font-medium">{email}</div>
          </div>
          {links.length > 0 ? (
            <div className="space-y-1 px-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex h-8 items-center rounded-md px-2 text-sm text-foreground transition-colors hover:bg-muted"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ) : null}
          <LogoutButton variant="ghost" className="w-full justify-start">
            {t("signOut")}
          </LogoutButton>
        </div>
      </PopoverContent>
    </Popover>
  );
}
