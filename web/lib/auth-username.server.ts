import { randomUUID } from "node:crypto";
import {
  normalizeUsername,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from "@/lib/auth-username";

type UsernameLookupResult = {
  id: string;
};

type FindUserByUsername = (
  username: string,
) => Promise<UsernameLookupResult | null>;

type GenerateUniqueUsernameOptions = {
  findUserByUsername: FindUserByUsername;
  createRandomSuffix?: () => string;
  maxAttempts?: number;
};

type ResolveCreatedUsernameOptions = {
  providedUsername?: string | null;
  seed: string;
  findUserByUsername: FindUserByUsername;
  createRandomSuffix?: () => string;
};

export type ResolvedCreatedUsername = {
  username: string;
  usernameNeedsSetup: boolean;
  usernameAutoAdjusted: boolean;
};

function createRandomSuffix() {
  return randomUUID().slice(0, 6);
}

function createUsernameCandidateBase(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.]+/g, ".")
    .replace(/[.]{2,}/g, ".")
    .replace(/^[._]+|[._]+$/g, "");
}

export async function generateUniqueUsername(
  seed: string,
  {
    findUserByUsername,
    createRandomSuffix: createSuffix = createRandomSuffix,
    maxAttempts = 12,
  }: GenerateUniqueUsernameOptions,
) {
  const fallbackBase = "user";
  const normalizedBase = createUsernameCandidateBase(seed);
  const base =
    normalizedBase.length >= USERNAME_MIN_LENGTH
      ? normalizedBase
      : fallbackBase;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const suffix = attempt === 0 ? "" : `.${createSuffix()}`;
    const maxBaseLength = USERNAME_MAX_LENGTH - suffix.length;
    const candidateBase = base.slice(0, Math.max(maxBaseLength, 0)).trim();
    const candidate = `${candidateBase || fallbackBase}${suffix}`;
    const existingUser = await findUserByUsername(candidate);

    if (!existingUser) {
      return candidate;
    }
  }

  return `user.${createSuffix()}`;
}

export async function resolveCreatedUsername({
  providedUsername,
  seed,
  findUserByUsername,
  createRandomSuffix,
}: ResolveCreatedUsernameOptions): Promise<ResolvedCreatedUsername> {
  const normalizedProvidedUsername =
    typeof providedUsername === "string"
      ? normalizeUsername(providedUsername)
      : "";

  if (!normalizedProvidedUsername) {
    return {
      username: await generateUniqueUsername(seed, {
        findUserByUsername,
        createRandomSuffix,
      }),
      usernameNeedsSetup: true,
      usernameAutoAdjusted: false,
    };
  }

  const existingUser = await findUserByUsername(normalizedProvidedUsername);

  if (!existingUser) {
    return {
      username: normalizedProvidedUsername,
      usernameNeedsSetup: false,
      usernameAutoAdjusted: false,
    };
  }

  return {
    username: await generateUniqueUsername(normalizedProvidedUsername, {
      findUserByUsername,
      createRandomSuffix,
    }),
    usernameNeedsSetup: false,
    usernameAutoAdjusted: true,
  };
}
