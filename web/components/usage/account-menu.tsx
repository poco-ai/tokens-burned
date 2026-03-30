"use client";

import {
  ArrowLeftRight,
  Cog,
  Home,
  LayoutDashboard,
  LogOut,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { LogoutButton } from "@/components/auth/logout-button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type AccountMenuProps = {
  email: string;
  name?: string | null;
  image?: string | null;
  username?: string | null;
};

function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || "?";
}

function getIdentityLines(
  email: string,
  name?: string | null,
  username?: string | null,
) {
  const trimmedName = name?.trim();

  if (trimmedName) {
    return {
      primary: trimmedName,
      secondary: username ? `@${username}` : email,
    };
  }

  if (username) {
    return {
      primary: username,
      secondary: `@${username}`,
    };
  }

  const local = email.split("@")[0]?.trim() || email;
  return { primary: local, secondary: email };
}

type MenuLink = {
  href: string;
  label: string;
  icon: typeof Home;
};

function AccountAvatar({
  image,
  identity,
  sizeClassName,
  textClassName,
}: {
  image?: string | null;
  identity: string;
  sizeClassName: string;
  textClassName: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  if (image && !imageFailed) {
    return (
      /* biome-ignore lint/performance/noImgElement: user avatars may come from arbitrary remote URLs */
      <img
        src={image}
        alt=""
        className={`${sizeClassName} rounded-full object-cover`}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-foreground font-semibold text-background ${sizeClassName} ${textClassName}`}
    >
      {getInitial(identity)}
    </span>
  );
}

export function AccountMenu({
  email,
  name,
  image,
  username,
}: AccountMenuProps) {
  const t = useTranslations("common");
  const tUsage = useTranslations("usage.accountMenu");
  const tSocial = useTranslations("social.nav");
  const identity = name?.trim() || username || email;
  const { primary, secondary } = getIdentityLines(email, name, username);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);

  const links: MenuLink[] = [
    ...(username
      ? [{ href: `/u/${username}`, label: tSocial("profile"), icon: Home }]
      : []),
    {
      href: "/usage",
      label: tSocial("dashboard"),
      icon: LayoutDashboard,
    },
    { href: "/people", label: tSocial("people"), icon: Users },
    { href: "/settings", label: t("settings"), icon: Cog },
  ];

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);

    return () => {
      if (closeTimeoutRef.current) {
        window.clearTimeout(closeTimeoutRef.current);
      }

      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  const openMenu = () => {
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    setOpen(true);
  };

  const closeMenu = () => {
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
    }

    closeTimeoutRef.current = window.setTimeout(() => {
      setOpen(false);
      closeTimeoutRef.current = null;
    }, 120);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className="inline-flex size-9 items-center justify-center rounded-full outline-none transition-transform hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-ring/50"
        aria-label={tUsage("open")}
        aria-expanded={open}
        aria-haspopup="menu"
        onPointerEnter={openMenu}
        onPointerLeave={closeMenu}
        onFocus={openMenu}
        onBlur={(event) => {
          if (
            !containerRef.current?.contains(event.relatedTarget as Node | null)
          ) {
            setOpen(false);
          }
        }}
        onClick={() => setOpen((current) => !current)}
      >
        <AccountAvatar
          image={image}
          identity={identity}
          sizeClassName="size-5"
          textClassName="text-[0.7rem]"
        />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label={tUsage("menuLabel")}
          className="absolute right-0 top-full z-50 mt-2 flex w-64 flex-col gap-0 rounded-lg bg-popover p-2 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden"
          onPointerEnter={openMenu}
          onPointerLeave={closeMenu}
          onBlur={(event) => {
            if (
              !containerRef.current?.contains(
                event.relatedTarget as Node | null,
              )
            ) {
              setOpen(false);
            }
          }}
        >
          <div
            className="flex items-center gap-3 rounded-lg bg-muted/40 px-2 py-2"
            role="none"
          >
            <AccountAvatar
              image={image}
              identity={identity}
              sizeClassName="size-10 shrink-0"
              textClassName="text-sm"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold leading-tight text-foreground">
                {primary}
              </div>
              <div className="truncate text-xs leading-tight text-muted-foreground">
                {secondary}
              </div>
            </div>
            {/* TODO: Enable routing or a real multi-account switcher once the product flow exists (e.g. /usage, settings, or provider linking). */}
            <button
              type="button"
              disabled
              className={cn(
                "inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-primary/40 text-muted-foreground",
                "cursor-not-allowed opacity-60",
                "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
              )}
              title={tUsage("accountSwitcher")}
              aria-label={tUsage("accountSwitcher")}
            >
              <ArrowLeftRight className="size-4" strokeWidth={2} />
            </button>
          </div>

          <div className="mt-2 flex flex-col gap-0.5 border-t border-border/60 pt-2">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  role="menuitem"
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                  onClick={() => setOpen(false)}
                >
                  <Icon
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="mt-1 border-t border-border/60 pt-1">
            <LogoutButton
              role="menuitem"
              variant="ghost"
              size="sm"
              className="h-auto w-full justify-start gap-2 px-2 py-1.5 font-normal text-foreground hover:bg-muted"
            >
              <LogOut
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              {t("signOut")}
            </LogoutButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
