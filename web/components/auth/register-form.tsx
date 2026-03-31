"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { authConfig } from "@/lib/auth-config";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import {
  isValidUsername,
  normalizeUsername,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_TAKEN_ERROR_MESSAGE,
} from "@/lib/auth-username";

// Registration is only available in self-hosted mode
if (!authConfig.isSelfHosted) {
  throw new Error("Registration is not available in production mode");
}

export function RegisterForm() {
  const router = useRouter();
  const t = useTranslations("auth");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [nameError, setNameError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setFormError(null);
    setNameError(null);
    setUsernameError(null);
    setEmailError(null);
    setPasswordError(null);

    const trimmedName = name.trim();
    const normalizedUsername = normalizeUsername(username);
    const trimmedEmail = email.trim();
    let hasError = false;

    if (trimmedName.length < 2) {
      setNameError(t("register.errors.nameTooShort"));
      hasError = true;
    } else if (trimmedName.length > 50) {
      setNameError(t("register.errors.nameTooLong"));
      hasError = true;
    }

    if (!normalizedUsername) {
      setUsernameError(t("register.errors.usernameRequired"));
      hasError = true;
    } else if (normalizedUsername.length < USERNAME_MIN_LENGTH) {
      setUsernameError(t("register.errors.usernameTooShort"));
      hasError = true;
    } else if (normalizedUsername.length > USERNAME_MAX_LENGTH) {
      setUsernameError(t("register.errors.usernameTooLong"));
      hasError = true;
    } else if (!isValidUsername(normalizedUsername)) {
      setUsernameError(t("register.errors.usernameInvalid"));
      hasError = true;
    }

    if (!trimmedEmail) {
      setEmailError(t("register.errors.emailRequired"));
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError(t("register.errors.emailInvalid"));
      hasError = true;
    }

    if (!password) {
      setPasswordError(t("register.errors.passwordRequired"));
      hasError = true;
    } else if (password.length > 128) {
      setPasswordError(t("register.errors.passwordTooLong"));
      hasError = true;
    } else if (password.length < 8) {
      setPasswordError(t("register.errors.passwordTooShort"));
      hasError = true;
    }

    if (hasError) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await authClient.signUp.email({
        name: trimmedName,
        username: normalizedUsername,
        email: trimmedEmail,
        password,
      });

      if (result.error) {
        const errorMessage = getAuthErrorMessage(
          result.error,
          t("register.errors.default"),
        );

        setFormError(
          errorMessage === USERNAME_TAKEN_ERROR_MESSAGE
            ? t("register.errors.usernameTaken")
            : errorMessage,
        );
        return;
      }

      router.push("/usage");
      router.refresh();
    } catch (error) {
      const errorMessage = getAuthErrorMessage(
        error,
        t("register.errors.default"),
      );

      setFormError(
        errorMessage === USERNAME_TAKEN_ERROR_MESSAGE
          ? t("register.errors.usernameTaken")
          : errorMessage,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="register-name">{t("fields.name")}</Label>
        <Input
          id="register-name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={Boolean(nameError)}
        />
        {nameError ? (
          <p className="text-sm text-destructive">{nameError}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {t("register.nameHint")}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="register-username">{t("fields.username")}</Label>
        <Input
          id="register-username"
          type="text"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          aria-invalid={Boolean(usernameError)}
        />
        {usernameError ? (
          <p className="text-sm text-destructive">{usernameError}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {t("register.usernameHint")}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="register-email">{t("fields.email")}</Label>
        <Input
          id="register-email"
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
        <Label htmlFor="register-password">{t("fields.password")}</Label>
        <Input
          id="register-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={Boolean(passwordError)}
        />
        {passwordError ? (
          <p className="text-sm text-destructive">{passwordError}</p>
        ) : null}
      </div>

      <Button className="w-full" type="submit" disabled={isSubmitting}>
        {isSubmitting ? t("register.submitting") : t("register.submit")}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {t("register.agreementPrefix")}{" "}
        <Link href="/legal/terms" className="underline underline-offset-4">
          {t("register.termsLink")}
        </Link>{" "}
        {t("register.and")}{" "}
        <Link href="/legal/privacy" className="underline underline-offset-4">
          {t("register.privacyLink")}
        </Link>
      </p>

      <p className="text-center text-sm text-muted-foreground">
        {t("register.haveAccount")}{" "}
        <Link
          href="/login"
          className="text-foreground underline underline-offset-4"
        >
          {t("register.signInLink")}
        </Link>
      </p>
    </form>
  );
}
