export function getAuthErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object") {
    const withMessage = error as {
      message?: unknown;
      error?: { message?: unknown };
    };

    if (typeof withMessage.message === "string") {
      return withMessage.message;
    }

    if (typeof withMessage.error?.message === "string") {
      return withMessage.error.message;
    }
  }

  return fallbackMessage;
}
