import type { ReactNode } from "react";
import { AppFooter } from "@/components/app/app-footer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AuthShellProps = {
  title: string;
  description: string;
  headerActions?: ReactNode;
  footerActions?: ReactNode;
  cardFooter?: ReactNode;
  /** Renders behind the main column (e.g. full-page canvas). */
  background?: ReactNode;
  /** `hero`: title above the card (e.g. login with dither background). */
  titleVariant?: "default" | "hero";
  children: ReactNode;
};

export function AuthShell({
  title,
  description,
  headerActions,
  footerActions,
  cardFooter,
  background,
  titleVariant = "default",
  children,
}: AuthShellProps) {
  const heroTitle = titleVariant === "hero";

  return (
    <div className="relative min-h-screen-ios">
      {background}
      <main className="relative z-10 flex min-h-screen-ios flex-col">
        <div className="flex flex-1 flex-col items-center justify-center p-4">
          <div
            className={`w-full max-w-md ${heroTitle ? "space-y-5" : "space-y-3"}`}
          >
            {headerActions ? (
              <div className="flex justify-end gap-2">{headerActions}</div>
            ) : null}
            {heroTitle ? (
              <h1 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                {title}
              </h1>
            ) : null}
            <Card className="w-full">
              <CardHeader>
                {heroTitle ? null : <CardTitle>{title}</CardTitle>}
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent>{children}</CardContent>
            </Card>
            {cardFooter ? cardFooter : null}
          </div>
        </div>
        <AppFooter actions={footerActions} />
      </main>
    </div>
  );
}
