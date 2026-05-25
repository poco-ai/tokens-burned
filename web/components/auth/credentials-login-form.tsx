"use client";

import { useTranslations } from "next-intl";
import { useReducer, useState } from "react";
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

type FormStatus = {
  emailError: string | null;
  passwordError: string | null;
  formError: string | null;
  isSubmitting: boolean;
};

type FormStatusAction =
  | { type: "RESET_ERRORS" }
  | { type: "SET_EMAIL_ERROR"; error: string }
  | { type: "SET_PASSWORD_ERROR"; error: string }
  | { type: "SET_FORM_ERROR"; error: string }
  | { type: "SET_SUBMITTING"; value: boolean };

const initialFormStatus: FormStatus = {
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
        emailError: null,
        passwordError: null,
        formError: null,
      };
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

export function CredentialsLoginForm({
  showInvalidSessionMessage = false,
}: CredentialsLoginFormProps) {
  const { push, refresh } = useRouter();
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, dispatch] = useReducer(formStatusReducer, initialFormStatus);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    dispatch({ type: "RESET_ERRORS" });

    const trimmedEmail = email.trim();
    let hasError = false;

    if (!trimmedEmail) {
      dispatch({
        type: "SET_EMAIL_ERROR",
        error: t("login.errors.emailRequired"),
      });
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      dispatch({
        type: "SET_EMAIL_ERROR",
        error: t("login.errors.emailInvalid"),
      });
      hasError = true;
    }

    if (!password) {
      dispatch({
        type: "SET_PASSWORD_ERROR",
        error: t("login.errors.passwordRequired"),
      });
      hasError = true;
    } else if (password.length > 128) {
      dispatch({
        type: "SET_PASSWORD_ERROR",
        error: t("login.errors.passwordTooLong"),
      });
      hasError = true;
    } else if (password.length < 8) {
      dispatch({
        type: "SET_PASSWORD_ERROR",
        error: t("login.errors.passwordTooShort"),
      });
      hasError = true;
    }

    if (hasError) {
      return;
    }

    dispatch({ type: "SET_SUBMITTING", value: true });

    try {
      const result = await authClient.signIn.email({
        email: trimmedEmail,
        password,
      });

      if (result.error) {
        dispatch({
          type: "SET_FORM_ERROR",
          error: getAuthErrorMessage(result.error, t("login.errors.default")),
        });
        return;
      }

      push("/usage");
      refresh();
    } catch (error) {
      dispatch({
        type: "SET_FORM_ERROR",
        error: getAuthErrorMessage(error, t("login.errors.default")),
      });
    } finally {
      dispatch({ type: "SET_SUBMITTING", value: false });
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {showInvalidSessionMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{t("login.invalidSession")}</AlertDescription>
        </Alert>
      ) : null}

      {status.formError ? (
        <Alert variant="destructive">
          <AlertDescription>{status.formError}</AlertDescription>
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
          aria-invalid={Boolean(status.emailError)}
        />
        {status.emailError ? (
          <p className="text-sm text-destructive">{status.emailError}</p>
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
          aria-invalid={Boolean(status.passwordError)}
        />
        {status.passwordError ? (
          <p className="text-sm text-destructive">{status.passwordError}</p>
        ) : null}
      </div>

      <Button className="w-full" type="submit" disabled={status.isSubmitting}>
        {status.isSubmitting ? t("login.submitting") : t("login.submit")}
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
