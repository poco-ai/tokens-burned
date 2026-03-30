"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import { emitPreferenceSavedNotice } from "@/lib/usage/preference-notice";
import type { ProjectMode } from "@/lib/usage/types";

type AccountIdentityCardProps = {
  initialName?: string;
  initialUsername?: string;
  requireUsernameSetup?: boolean;
  initialBio: string | null;
  preferenceSnapshot: {
    timezone: string;
    projectMode: ProjectMode;
    publicProfileEnabled: boolean;
  };
};

export function AccountIdentityCard({
  initialName = "",
  initialUsername = "",
  requireUsernameSetup = false,
  initialBio,
  preferenceSnapshot,
}: AccountIdentityCardProps) {
  const router = useRouter();
  const t = useTranslations("usage.settings");
  const [name, setName] = useState(initialName);
  const [username, setUsername] = useState(initialUsername);
  const [savedName, setSavedName] = useState(initialName);
  const [savedUsername, setSavedUsername] = useState(initialUsername);
  const [bio, setBio] = useState(initialBio ?? "");
  const [savedBio, setSavedBio] = useState(initialBio ?? "");
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

  useEffect(() => {
    setBio(initialBio ?? "");
    setSavedBio(initialBio ?? "");
  }, [initialBio]);

  const normalizedUsername = useMemo(
    () => normalizeUsername(username),
    [username],
  );

  const hasIdentityChanges =
    name.trim() !== savedName.trim() || normalizedUsername !== savedUsername;

  const hasBioChanges = bio.trim() !== savedBio.trim();

  const hasChanges = hasIdentityChanges || hasBioChanges;

  const saveBio = async (nextBio: string) => {
    const response = await fetch("/api/usage/preferences", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bio: nextBio.trim() ? nextBio.trim() : null,
      }),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error ?? t("saveFailed"));
    }

    setSavedBio(payload.bio ?? "");
    emitPreferenceSavedNotice({
      timezone: preferenceSnapshot.timezone,
      projectMode: preferenceSnapshot.projectMode,
      publicProfileEnabled: preferenceSnapshot.publicProfileEnabled,
      bio: payload.bio,
    });
  };

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

    if (!hasChanges && !requireUsernameSetup) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (hasIdentityChanges || requireUsernameSetup) {
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

        if (requireUsernameSetup) {
          if (hasBioChanges) {
            await saveBio(bio);
          }
          router.refresh();
          router.push("/usage");
          return;
        }

        router.refresh();
      }

      if (hasBioChanges) {
        await saveBio(bio);
        if (!hasIdentityChanges && !requireUsernameSetup) {
          setSuccessMessage(t("saved"));
        }
        router.refresh();
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
    <div className="space-y-3">
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

        <div className="space-y-1.5">
          <Label htmlFor="settings-bio">{t("bio")}</Label>
          <textarea
            id="settings-bio"
            value={bio}
            onChange={(event) => setBio(event.target.value.slice(0, 160))}
            placeholder={t("bioPlaceholder")}
            maxLength={160}
            rows={3}
            className="w-full rounded-lg border border-border/60 bg-background px-2.5 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
          />
          <div className="text-xs text-muted-foreground">{bio.length}/160</div>
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
    </div>
  );
}
