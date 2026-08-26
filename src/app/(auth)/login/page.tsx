import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { redirectIfAuthenticated } from "@/app/(auth)/_lib/redirect-if-authenticated";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your I Gotta Guy account.",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; code?: string; token_hash?: string }>;
}) {
  const { next, code, token_hash: tokenHash } = await searchParams;

  // A magic-link click lands here with a credential to redeem (`code` or
  // `token_hash`) — that has to run (and may authenticate as a *different*
  // user than any existing session) before deciding where to send the
  // browser, so the normal already-authenticated redirect is skipped for
  // this one case and left to the client-side callback handler instead.
  if (!code && !tokenHash) {
    await redirectIfAuthenticated(next ?? null);
  }

  return <LoginForm next={next ?? null} code={code ?? null} tokenHash={tokenHash ?? null} />;
}
