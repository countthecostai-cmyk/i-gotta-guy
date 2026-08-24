import type { Metadata } from "next";
import { SignupForm } from "@/app/(auth)/_components/signup-form";
import { redirectIfAuthenticated } from "@/app/(auth)/_lib/redirect-if-authenticated";

export const metadata: Metadata = {
  title: "Become A Guy",
  description: "Apply to become a Guy on I Gotta Guy and start accepting local service jobs.",
  robots: { index: false, follow: false },
};

export default async function GuySignupPage() {
  // An authenticated customer landing here wants to apply as a Guy on
  // their existing account, not create a second account — send them to
  // /guy, which shows the in-app apply prompt for a user with no Guy
  // profile yet (customerFallback override; already-Guy/admin still route
  // to their own home surface via the default logic).
  await redirectIfAuthenticated(null, "/guy");
  return <SignupForm role="guy" next={null} />;
}
