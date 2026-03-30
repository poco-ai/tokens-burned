import type { ReactNode } from "react";
import { AppShell } from "@/components/app/app-shell";

type SocialShellProps = {
  locale: string;
  viewer: {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    username?: string | null;
  } | null;
  children: ReactNode;
};

export async function SocialShell({
  locale,
  viewer,
  children,
}: SocialShellProps) {
  return (
    <AppShell locale={locale} viewer={viewer}>
      {children}
    </AppShell>
  );
}
