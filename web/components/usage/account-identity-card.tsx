"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
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

type FormStatus = {
  nameError: string | null;
  usernameError: string | null;
  formError: string | null;
  successMessage: string | null;
  isSubmitting: boolean;
  justSaved: boolean;
};

type FormStatusAction =
  | { type: "RESET_ALL" }
  | { type: "SET_NAME_ERROR"; error: string }
  | { type: "SET_USERNAME_ERROR"; error: string }
  | { type: "SET_FORM_ERROR"; error: string }
  | { type: "SET_SUCCESS"; message: string }
  | { type: "SET_SUBMITTING"; value: boolean }
  | { type: "SET_JUST_SAVED"; value: boolean }
  | { type: "CLEAR_JUST_SAVED" };

const initialFormStatus: FormStatus = {
  nameError: null,
  usernameError: null,
  formError: null,
  successMessage: null,
  isSubmitting: false,
  justSaved: false,
};

function formStatusReducer(
  state: FormStatus,
  action: FormStatusAction,
): FormStatus {
  switch (action.type) {
    case "RESET_ALL":
      return {
        ...state,
        nameError: null,
        usernameError: null,
        formError: null,
        successMessage: null,
        justSaved: false,
      };
    case "SET_NAME_ERROR":
      return { ...state, nameError: action.error };
    case "SET_USERNAME_ERROR":
      return { ...state, usernameError: action.error };
    case "SET_FORM_ERROR":
      return { ...state, formError: action.error };
    case "SET_SUCCESS":
      return { ...state, successMessage: action.message };
    case "SET_SUBMITTING":
      return { ...state, isSubmitting: action.value };
    case "SET_JUST_SAVED":
      return { ...state, justSaved: action.value };
    case "CLEAR_JUST_SAVED":
      return { ...state, justSaved: false };
    default:
      return state;
  }
}

export function AccountIdentityCard({
  initialName = "",
  initialUsername = "",
  requireUsernameSetup = false,
  initialBio,
  preferenceSnapshot,
}: AccountIdentityCardProps) {
  const { push, refresh } = useRouter();
  const t = useTranslations("usage.settings");
  // react-doctor-disable-next-line react-doctor/no-derived-useState -- form input, initial value from prop
  const [name, setName] = useState(initialName);
  // react-doctor-disable-next-line react-doctor/no-derived-useState -- form input, initial value from prop
  const [username, setUsername] = useState(initialUsername);
  const savedName = useRef(initialName);
  const savedUsername = useRef(initialUsername);
  const [bio, setBio] = useState(initialBio ?? "");
  const savedBio = useRef(initialBio ?? "");
  const [status, dispatch] = useReducer(formStatusReducer, initialFormStatus);

  useEffect(() => {
    setName(initialName);
    setUsername(initialUsername);
    savedName.current = initialName;
    savedUsername.current = initialUsername;
  }, [initialName, initialUsername]);

  useEffect(() => {
    setBio(initialBio ?? "");
    savedBio.current = initialBio ?? "";
  }, [initialBio]);

  useEffect(() => {
    if (!status.justSaved) {
      return;
    }

    const timeout = window.setTimeout(() => {
      dispatch({ type: "CLEAR_JUST_SAVED" });
    }, 2500);

    return () => window.clearTimeout(timeout);
  }, [status.justSaved]);

  const normalizedUsername = useMemo(
    () => normalizeUsername(username),
    [username],
  );

  const hasIdentityChanges =
    name.trim() !== savedName.current.trim() ||
    normalizedUsername !== savedUsername.current;

  const hasBioChanges = bio.trim() !== savedBio.current.trim();

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

    savedBio.current = payload.bio ?? "";
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

    dispatch({ type: "RESET_ALL" });

    let hasError = false;

    if (!trimmedName) {
      dispatch({
        type: "SET_NAME_ERROR",
        error: t("identity.errors.nameRequired"),
      });
      hasError = true;
    } else if (trimmedName.length > 50) {
      dispatch({
        type: "SET_NAME_ERROR",
        error: t("identity.errors.nameTooLong"),
      });
      hasError = true;
    }

    if (!normalizedUsername) {
      dispatch({
        type: "SET_USERNAME_ERROR",
        error: t("identity.errors.usernameRequired"),
      });
      hasError = true;
    } else if (normalizedUsername.length < USERNAME_MIN_LENGTH) {
      dispatch({
        type: "SET_USERNAME_ERROR",
        error: t("identity.errors.usernameTooShort"),
      });
      hasError = true;
    } else if (normalizedUsername.length > USERNAME_MAX_LENGTH) {
      dispatch({
        type: "SET_USERNAME_ERROR",
        error: t("identity.errors.usernameTooLong"),
      });
      hasError = true;
    } else if (!isValidUsername(normalizedUsername)) {
      dispatch({
        type: "SET_USERNAME_ERROR",
        error: t("identity.errors.usernameInvalid"),
      });
      hasError = true;
    }

    if (hasError) {
      return;
    }

    if (!hasChanges && !requireUsernameSetup) {
      return;
    }

    dispatch({ type: "SET_SUBMITTING", value: true });

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

          dispatch({
            type: "SET_FORM_ERROR",
            error:
              errorMessage === USERNAME_TAKEN_ERROR_MESSAGE
                ? t("identity.errors.usernameTaken")
                : errorMessage,
          });
          return;
        }

        savedName.current = trimmedName;
        savedUsername.current = normalizedUsername;
        dispatch({ type: "SET_SUCCESS", message: t("identity.saved") });
        dispatch({ type: "SET_JUST_SAVED", value: true });

        if (requireUsernameSetup) {
          if (hasBioChanges) {
            await saveBio(bio);
          }
          refresh();
          push("/usage");
          return;
        }

        refresh();
      }

      if (hasBioChanges) {
        await saveBio(bio);
        if (!hasIdentityChanges && !requireUsernameSetup) {
          dispatch({ type: "SET_SUCCESS", message: t("saved") });
          dispatch({ type: "SET_JUST_SAVED", value: true });
        }
        refresh();
      }
    } catch (error) {
      const errorMessage = getAuthErrorMessage(
        error,
        t("identity.errors.default"),
      );

      dispatch({
        type: "SET_FORM_ERROR",
        error:
          errorMessage === USERNAME_TAKEN_ERROR_MESSAGE
            ? t("identity.errors.usernameTaken")
            : errorMessage,
      });
    } finally {
      dispatch({ type: "SET_SUBMITTING", value: false });
    }
  };

  return (
    <div className="space-y-3">
      {requireUsernameSetup ? (
        <Alert>
          <AlertDescription>{t("identity.setupNotice")}</AlertDescription>
        </Alert>
      ) : null}

      {status.formError ? (
        <Alert variant="destructive">
          <AlertDescription>{status.formError}</AlertDescription>
        </Alert>
      ) : null}

      {status.successMessage && !requireUsernameSetup ? (
        <Alert>
          <AlertDescription>{status.successMessage}</AlertDescription>
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
            aria-invalid={Boolean(status.nameError)}
          />
          <p
            className={
              status.nameError
                ? "text-sm text-destructive"
                : "text-xs text-muted-foreground"
            }
          >
            {status.nameError ?? t("identity.nameHint")}
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
            aria-invalid={Boolean(status.usernameError)}
          />
          <div
            className={
              status.usernameError
                ? "text-sm text-destructive"
                : "space-y-1 text-xs text-muted-foreground"
            }
          >
            {status.usernameError ? (
              <p>{status.usernameError}</p>
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
            disabled={
              status.isSubmitting || (!hasChanges && !requireUsernameSetup)
            }
          >
            {status.isSubmitting
              ? t("identity.saving")
              : status.justSaved && !hasChanges
                ? t("saved")
                : t("identity.save")}
          </Button>
        </div>
      </form>
    </div>
  );
}
