"use client";

import { useCallback, useState, useTransition } from "react";

export function getErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return "Something went wrong. Please try again.";
}

/**
 * Wraps a "use server" action with pending/error state so client components
 * don't repeat the same try/catch/useTransition boilerplate. Every server
 * action in this app throws ActionError with a safe `.message` on failure —
 * this hook surfaces that message and swallows nothing silently.
 */
export function useServerAction<Args extends unknown[], R>(action: (...args: Args) => Promise<R>) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    (...args: Args) =>
      new Promise<R | undefined>((resolve) => {
        setError(null);
        startTransition(async () => {
          try {
            const result = await action(...args);
            resolve(result);
          } catch (err) {
            setError(getErrorMessage(err));
            resolve(undefined);
          }
        });
      }),
    [action],
  );

  return { run, pending, error, setError };
}
