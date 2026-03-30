"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useState } from "react";
import { SiGithub, SiGoogle } from "react-icons/si";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import type { LoginProvider } from "@/lib/auth-providers";

type SocialLoginFormProps = {
  showInvalidSessionMessage?: boolean;
  providers: LoginProvider[];
};

function renderProviderIcon(providerId: LoginProvider["id"]): ReactNode {
  switch (providerId) {
    case "github":
      return <SiGithub className="mr-2 h-4 w-4" />;
    case "google":
      return <SiGoogle className="mr-2 h-4 w-4" />;
    case "linuxdo":
      return (
        <Image
          src="https://linux.do/logo-128.svg"
          alt="Linux.do"
          width={16}
          height={16}
          className="mr-2"
        />
      );
    case "watcha":
      return (
        <Image
          src="https://watcha.tos-cn-beijing.volces.com/products/logo/1752064513_guan-cha-insights.png?x-tos-process=image/resize,w_72/format,webp"
          alt="Watcha"
          width={16}
          height={16}
          className="mr-2"
        />
      );
  }
}

export function SocialLoginForm({
  showInvalidSessionMessage = false,
  providers,
}: SocialLoginFormProps) {
  const t = useTranslations("auth");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleProviderSignIn = async (provider: LoginProvider) => {
    setIsSubmitting(true);
    setFormError(null);

    try {
      if (provider.kind === "social") {
        await authClient.signIn.social({
          provider: provider.id,
          callbackURL: "/usage",
        });
      } else {
        await authClient.signIn.oauth2({
          providerId: provider.id,
          callbackURL: "/usage",
        });
      }
    } catch (error) {
      setFormError(getAuthErrorMessage(error, t("login.errors.default")));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {showInvalidSessionMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{t("login.invalidSession")}</AlertDescription>
        </Alert>
      ) : null}

      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      {providers.length === 0 ? (
        <Alert>
          <AlertDescription>{t("login.noProviders")}</AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {providers.map((provider) => (
            <Button
              key={provider.id}
              type="button"
              variant="outline"
              onClick={() => handleProviderSignIn(provider)}
              disabled={isSubmitting}
            >
              {renderProviderIcon(provider.id)}
              {provider.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
