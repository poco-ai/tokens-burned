"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { getAuthErrorMessage } from "@/lib/auth-errors";

type CredentialsLoginFormProps = {
  showInvalidSessionMessage?: boolean;
};

export function CredentialsLoginForm({
  showInvalidSessionMessage = false,
}: CredentialsLoginFormProps) {
  const router = useRouter();
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setFormError(null);
    setEmailError(null);
    setPasswordError(null);

    const trimmedEmail = email.trim();
    let hasError = false;

    if (!trimmedEmail) {
      setEmailError(t("login.errors.emailRequired"));
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError(t("login.errors.emailInvalid"));
      hasError = true;
    }

    if (!password) {
      setPasswordError(t("login.errors.passwordRequired"));
      hasError = true;
    } else if (password.length > 128) {
      setPasswordError(t("login.errors.passwordTooLong"));
      hasError = true;
    } else if (password.length < 8) {
      setPasswordError(t("login.errors.passwordTooShort"));
      hasError = true;
    }

    if (hasError) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await authClient.signIn.email({
        email: trimmedEmail,
        password,
      });

      if (result.error) {
        setFormError(
          getAuthErrorMessage(result.error, t("login.errors.default")),
        );
        return;
      }

      router.push("/usage");
      router.refresh();
    } catch (error) {
      setFormError(getAuthErrorMessage(error, t("login.errors.default")));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
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

      <div className="space-y-2">
        <Label htmlFor="login-email">{t("fields.email")}</Label>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={Boolean(emailError)}
        />
        {emailError ? (
          <p className="text-sm text-destructive">{emailError}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="login-password">{t("fields.password")}</Label>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={Boolean(passwordError)}
        />
        {passwordError ? (
          <p className="text-sm text-destructive">{passwordError}</p>
        ) : null}
      </div>

      <Button className="w-full" type="submit" disabled={isSubmitting}>
        {isSubmitting ? t("login.submitting") : t("login.submit")}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {t("login.noAccount")}{" "}
        <Link
          href="/register"
          className="text-foreground underline underline-offset-4"
        >
          {t("login.registerLink")}
        </Link>
      </p>
    </form>
  );
}
