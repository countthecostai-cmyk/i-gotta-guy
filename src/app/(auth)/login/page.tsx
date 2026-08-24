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
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  await redirectIfAuthenticated(next ?? null);
  return <LoginForm next={next ?? null} />;
}
