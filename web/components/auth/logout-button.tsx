"use client";

import { useTranslations } from "next-intl";
import { type ComponentProps, type ReactNode, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type ButtonProps = ComponentProps<typeof Button>;

type LogoutButtonProps = {
  children?: ReactNode;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
} & Omit<ButtonProps, "children" | "onClick" | "type" | "disabled">;

export function LogoutButton({
  children,
  variant = "outline",
  size = "default",
  className,
  ...rest
}: LogoutButtonProps) {
  const { push, refresh } = useRouter();
  const t = useTranslations("common");
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      try {
        await authClient.signOut();
      } finally {
        push("/login");
        refresh();
      }
    });
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn(className)}
      onClick={handleLogout}
      disabled={isPending}
      {...rest}
    >
      {isPending ? t("signingOut") : (children ?? t("signOut"))}
    </Button>
  );
}
