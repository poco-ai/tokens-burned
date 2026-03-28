"use client";

import { useTranslations } from "next-intl";
import { type ComponentProps, type ReactNode, useState } from "react";
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
  const router = useRouter();
  const t = useTranslations("common");
  const [isPending, setIsPending] = useState(false);

  const handleClick = async () => {
    setIsPending(true);

    try {
      await authClient.signOut();
    } finally {
      router.push("/login");
      router.refresh();
      setIsPending(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn(className)}
      onClick={handleClick}
      disabled={isPending}
      {...rest}
    >
      {isPending ? t("signingOut") : (children ?? t("signOut"))}
    </Button>
  );
}
