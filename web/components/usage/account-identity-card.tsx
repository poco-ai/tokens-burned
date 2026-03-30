"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import {
  isValidUsername,
  normalizeUsername,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_TAKEN_ERROR_MESSAGE,
} from "@/lib/auth-username";

type AccountIdentityCardProps = {
  initialName?: string;
  initialUsername?: string;
  requireUsernameSetup?: boolean;
};

export function AccountIdentityCard({
  initialName = "",
  initialUsername = "",
  requireUsernameSetup = false,
}: AccountIdentityCardProps) {
  const router = useRouter();
  const t = useTranslations("usage.settings");
  const [name, setName] = useState(initialName);
  const [username, setUsername] = useState(initialUsername);
  const [savedName, setSavedName] = useState(initialName);
  const [savedUsername, setSavedUsername] = useState(initialUsername);
  const [nameError, setNameError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setName(initialName);
    setUsername(initialUsername);
    setSavedName(initialName);
    setSavedUsername(initialUsername);
  }, [initialName, initialUsername]);

  const normalizedUsername = useMemo(
    () => normalizeUsername(username),
    [username],
  );

  const hasChanges =
    name.trim() !== savedName.trim() || normalizedUsername !== savedUsername;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();

    setNameError(null);
    setUsernameError(null);
    setFormError(null);
    setSuccessMessage(null);

    let hasError = false;

    if (!trimmedName) {
      setNameError(t("identity.errors.nameRequired"));
      hasError = true;
    } else if (trimmedName.length > 50) {
      setNameError(t("identity.errors.nameTooLong"));
      hasError = true;
    }

    if (!normalizedUsername) {
      setUsernameError(t("identity.errors.usernameRequired"));
      hasError = true;
    } else if (normalizedUsername.length < USERNAME_MIN_LENGTH) {
      setUsernameError(t("identity.errors.usernameTooShort"));
      hasError = true;
    } else if (normalizedUsername.length > USERNAME_MAX_LENGTH) {
      setUsernameError(t("identity.errors.usernameTooLong"));
      hasError = true;
    } else if (!isValidUsername(normalizedUsername)) {
      setUsernameError(t("identity.errors.usernameInvalid"));
      hasError = true;
    }

    if (hasError) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await authClient.updateUser({
        name: trimmedName,
        username: normalizedUsername,
      });

      if (result.error) {
        const errorMessage = getAuthErrorMessage(
          result.error,
          t("identity.errors.default"),
        );

        setFormError(
          errorMessage === USERNAME_TAKEN_ERROR_MESSAGE
            ? t("identity.errors.usernameTaken")
            : errorMessage,
        );
        return;
      }

      setSavedName(trimmedName);
      setSavedUsername(normalizedUsername);
      setSuccessMessage(t("identity.saved"));

      router.refresh();

      if (requireUsernameSetup) {
        router.push("/usage");
      }
    } catch (error) {
      const errorMessage = getAuthErrorMessage(
        error,
        t("identity.errors.default"),
      );

      setFormError(
        errorMessage === USERNAME_TAKEN_ERROR_MESSAGE
          ? t("identity.errors.usernameTaken")
          : errorMessage,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card size="sm" className="gap-0 bg-card shadow-sm ring-1 ring-border/60">
      <CardHeader className="border-b border-border/50 bg-card pb-2">
        <CardTitle>{t("identity.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-3">
        {requireUsernameSetup ? (
          <Alert>
            <AlertDescription>{t("identity.setupNotice")}</AlertDescription>
          </Alert>
        ) : null}

        {formError ? (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        {successMessage && !requireUsernameSetup ? (
          <Alert>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        ) : null}

        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="settings-name">{t("identity.name")}</Label>
            <Input
              id="settings-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={Boolean(nameError)}
            />
            <p
              className={
                nameError
                  ? "text-sm text-destructive"
                  : "text-xs text-muted-foreground"
              }
            >
              {nameError ?? t("identity.nameHint")}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="settings-username">{t("identity.username")}</Label>
            <Input
              id="settings-username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              aria-invalid={Boolean(usernameError)}
            />
            <div
              className={
                usernameError
                  ? "text-sm text-destructive"
                  : "space-y-1 text-xs text-muted-foreground"
              }
            >
              {usernameError ? (
                <p>{usernameError}</p>
              ) : (
                <>
                  <p>{t("identity.usernameHint")}</p>
                  <p>
                    {t("identity.usernamePreview", {
                      value: normalizedUsername || "your-name",
                    })}
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting || (!hasChanges && !requireUsernameSetup)}
            >
              {isSubmitting ? t("identity.saving") : t("identity.save")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
