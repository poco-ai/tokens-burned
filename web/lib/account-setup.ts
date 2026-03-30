import { redirect } from "next/navigation";

type UserWithSetupState = {
  usernameNeedsSetup?: boolean | null;
};

export function needsUsernameSetup(
  user: UserWithSetupState | null | undefined,
) {
  return user?.usernameNeedsSetup === true;
}

export function getAuthenticatedAppPath(
  locale: string,
  user: UserWithSetupState | null | undefined,
) {
  return needsUsernameSetup(user) ? `/${locale}/settings` : `/${locale}/usage`;
}

export function redirectIfUsernameSetupNeeded(
  locale: string,
  user: UserWithSetupState | null | undefined,
) {
  if (needsUsernameSetup(user)) {
    redirect(`/${locale}/settings`);
  }
}
