"use client";

import { useTranslations } from "next-intl";
import { useReducer, useState } from "react";
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

type FormStatus = {
  nameError: string | null;
  usernameError: string | null;
  emailError: string | null;
  passwordError: string | null;
  formError: string | null;
  isSubmitting: boolean;
};

type FormStatusAction =
  | { type: "RESET_ERRORS" }
  | { type: "SET_NAME_ERROR"; error: string }
  | { type: "SET_USERNAME_ERROR"; error: string }
  | { type: "SET_EMAIL_ERROR"; error: string }
  | { type: "SET_PASSWORD_ERROR"; error: string }
  | { type: "SET_FORM_ERROR"; error: string }
  | { type: "SET_SUBMITTING"; value: boolean };

const initialFormStatus: FormStatus = {
  nameError: null,
  usernameError: null,
  emailError: null,
  passwordError: null,
  formError: null,
  isSubmitting: false,
};

function formStatusReducer(
  state: FormStatus,
  action: FormStatusAction,
): FormStatus {
  switch (action.type) {
    case "RESET_ERRORS":
      return {
        ...state,
        nameError: null,
        usernameError: null,
        emailError: null,
        passwordError: null,
        formError: null,
      };
    case "SET_NAME_ERROR":
      return { ...state, nameError: action.error };
    case "SET_USERNAME_ERROR":
      return { ...state, usernameError: action.error };
    case "SET_EMAIL_ERROR":
      return { ...state, emailError: action.error };
    case "SET_PASSWORD_ERROR":
      return { ...state, passwordError: action.error };
    case "SET_FORM_ERROR":
      return { ...state, formError: action.error };
    case "SET_SUBMITTING":
      return { ...state, isSubmitting: action.value };
    default:
      return state;
  }
}

export function RegisterForm() {
  const { push, refresh } = useRouter();
  const t = useTranslations("auth");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, dispatch] = useReducer(formStatusReducer, initialFormStatus);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    dispatch({ type: "RESET_ERRORS" });

    const trimmedName = name.trim();
    const normalizedUsername = normalizeUsername(username);
    const trimmedEmail = email.trim();
    let hasError = false;

    if (trimmedName.length < 2) {
      dispatch({
        type: "SET_NAME_ERROR",
        error: t("register.errors.nameTooShort"),
      });
      hasError = true;
    } else if (trimmedName.length > 50) {
      dispatch({
        type: "SET_NAME_ERROR",
        error: t("register.errors.nameTooLong"),
      });
      hasError = true;
    }

    if (!normalizedUsername) {
      dispatch({
        type: "SET_USERNAME_ERROR",
        error: t("register.errors.usernameRequired"),
      });
      hasError = true;
    } else if (normalizedUsername.length < USERNAME_MIN_LENGTH) {
      dispatch({
        type: "SET_USERNAME_ERROR",
        error: t("register.errors.usernameTooShort"),
      });
      hasError = true;
    } else if (normalizedUsername.length > USERNAME_MAX_LENGTH) {
      dispatch({
        type: "SET_USERNAME_ERROR",
        error: t("register.errors.usernameTooLong"),
      });
      hasError = true;
    } else if (!isValidUsername(normalizedUsername)) {
      dispatch({
        type: "SET_USERNAME_ERROR",
        error: t("register.errors.usernameInvalid"),
      });
      hasError = true;
    }

    if (!trimmedEmail) {
      dispatch({
        type: "SET_EMAIL_ERROR",
        error: t("register.errors.emailRequired"),
      });
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      dispatch({
        type: "SET_EMAIL_ERROR",
        error: t("register.errors.emailInvalid"),
      });
      hasError = true;
    }

    if (!password) {
      dispatch({
        type: "SET_PASSWORD_ERROR",
        error: t("register.errors.passwordRequired"),
      });
      hasError = true;
    } else if (password.length > 128) {
      dispatch({
        type: "SET_PASSWORD_ERROR",
        error: t("register.errors.passwordTooLong"),
      });
      hasError = true;
    } else if (password.length < 8) {
      dispatch({
        type: "SET_PASSWORD_ERROR",
        error: t("register.errors.passwordTooShort"),
      });
      hasError = true;
    }

    if (hasError) {
      return;
    }

    dispatch({ type: "SET_SUBMITTING", value: true });

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

        dispatch({
          type: "SET_FORM_ERROR",
          error:
            errorMessage === USERNAME_TAKEN_ERROR_MESSAGE
              ? t("register.errors.usernameTaken")
              : errorMessage,
        });
        return;
      }

      push("/usage");
      refresh();
    } catch (error) {
      const errorMessage = getAuthErrorMessage(
        error,
        t("register.errors.default"),
      );

      dispatch({
        type: "SET_FORM_ERROR",
        error:
          errorMessage === USERNAME_TAKEN_ERROR_MESSAGE
            ? t("register.errors.usernameTaken")
            : errorMessage,
      });
    } finally {
      dispatch({ type: "SET_SUBMITTING", value: false });
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {status.formError ? (
        <Alert variant="destructive">
          <AlertDescription>{status.formError}</AlertDescription>
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
          aria-invalid={Boolean(status.nameError)}
        />
        {status.nameError ? (
          <p className="text-sm text-destructive">{status.nameError}</p>
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
          aria-invalid={Boolean(status.usernameError)}
        />
        {status.usernameError ? (
          <p className="text-sm text-destructive">{status.usernameError}</p>
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
          aria-invalid={Boolean(status.emailError)}
        />
        {status.emailError ? (
          <p className="text-sm text-destructive">{status.emailError}</p>
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
          aria-invalid={Boolean(status.passwordError)}
        />
        {status.passwordError ? (
          <p className="text-sm text-destructive">{status.passwordError}</p>
        ) : null}
      </div>

      <Button className="w-full" type="submit" disabled={status.isSubmitting}>
        {status.isSubmitting ? t("register.submitting") : t("register.submit")}
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
