import type { Metadata } from "next";
import { SignupForm } from "@/app/(auth)/_components/signup-form";
import { redirectIfAuthenticated } from "@/app/(auth)/_lib/redirect-if-authenticated";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create your I Gotta Guy account and request your first service.",
  robots: { index: false, follow: false },
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  await redirectIfAuthenticated(next ?? null);
  return <SignupForm role="customer" next={next ?? null} />;
}
