import type { AuthMode } from "@/lib/auth-config";
import type { LoginProvider } from "@/lib/auth-providers";
import { CredentialsLoginForm } from "./credentials-login-form";
import { SocialLoginForm } from "./social-login-form";

type LoginFormProps = {
  mode: AuthMode;
  showInvalidSessionMessage?: boolean;
  providers: LoginProvider[];
};

export function LoginForm({
  mode,
  showInvalidSessionMessage = false,
  providers,
}: LoginFormProps) {
  if (mode === "self-hosted") {
    return (
      <CredentialsLoginForm
        showInvalidSessionMessage={showInvalidSessionMessage}
      />
    );
  }

  return (
    <SocialLoginForm
      showInvalidSessionMessage={showInvalidSessionMessage}
      providers={providers}
    />
  );
}
