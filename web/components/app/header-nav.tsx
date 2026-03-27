"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type HeaderNavItem = {
  href: string;
  label: string;
  match?: "exact" | "prefix";
};

type AppHeaderNavProps = {
  items: HeaderNavItem[];
};

function isActivePath(
  pathname: string,
  href: string,
  match: HeaderNavItem["match"] = "exact",
) {
  if (match === "prefix") {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return pathname === href;
}

export function AppHeaderNav({ items }: AppHeaderNavProps) {
  const pathname = usePathname();

  if (items.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Primary" className="overflow-x-auto">
      <div className="flex min-w-max items-center gap-5">
        {items.map((item) => {
          const active = isActivePath(pathname, item.href, item.match);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex items-center border-b-2 border-transparent py-2 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors",
                "hover:text-foreground",
                active && "border-foreground text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
