"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

import { LogoutButton } from "@/components/auth/logout-button";
import { Button } from "@/components/ui/button";
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
  const links = [
    ...(username
      ? [{ href: `/u/${username}`, label: tSocial("profile") }]
      : []),
    { href: "/usage", label: tSocial("dashboard") },
    { href: "/people", label: tSocial("people") },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 px-2"
          aria-label={tUsage("open")}
        >
          <span className="inline-flex size-5 items-center justify-center rounded-full bg-foreground text-[0.7rem] font-semibold text-background">
            {getInitial(identity)}
          </span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </Button>
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
          <LogoutButton variant="ghost" className="w-full justify-start">
            {t("signOut")}
          </LogoutButton>
        </div>
      </PopoverContent>
    </Popover>
  );
}
