"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/config";
import { isSafeInternalPath } from "@/app/(auth)/_components/resolve-redirect";

// Next.js redacts the message of any *thrown* Server Action error in
// production builds (to avoid leaking internals), which meant real,
// user-facing validation messages (bad password, wrong credentials, email
// already registered, etc.) were replaced with a generic "Server Components
// render" error on the client. Returning a typed result instead of throwing
// keeps these expected, safe-to-show messages intact end to end.
export type ActionResult<T = { success: true }> = { error: string } | T;

const signUpSchema = z
  .object({
    email: z.string().email("Enter a valid email address."),
    password: z.string().min(8, "Password must be at least 8 characters"),
    fullName: z.string().min(1, "Enter your name.").max(120),
    role: z.enum(["customer", "guy"]).default("customer"),
    // Collected only on the customer signup form, so a first-time customer
    // has a default address waiting for them the moment they request a
    // service instead of typing one in from scratch. Optional at the schema
    // level (a customer can always add one later from /app/addresses) —
    // enforced as required in the UI for the customer flow specifically.
    addressLine1: z.string().max(200).optional(),
    addressLine2: z.string().max(200).optional(),
    addressCity: z.string().max(120).optional(),
    addressState: z.string().max(60).optional(),
    addressPostalCode: z.string().max(20).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.role !== "customer") return;
    if (!val.addressLine1?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter your street address.", path: ["addressLine1"] });
    if (!val.addressCity?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter your city.", path: ["addressCity"] });
    if (!val.addressState?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter your state.", path: ["addressState"] });
    if (!val.addressPostalCode?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter your ZIP code.", path: ["addressPostalCode"] });
  });

export async function signUp(input: z.infer<typeof signUpSchema>): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check your details." };

  // Created directly via the service-role admin API with `email_confirm:
  // true`, rather than the public signUp() + Supabase's own confirmation
  // email. This project's transactional email (Resend) is still in sandbox
  // mode — until a sending domain is verified, Resend will only deliver to
  // the account owner's own inbox, so routing signup through a confirmation
  // email fails for every other real user (`550 You can only send testing
  // emails to your own email address...`). Creating the account
  // pre-confirmed sidesteps that dependency entirely. This does not weaken
  // any real security boundary: email confirmation only proves the address
  // is reachable, it was never how authorization or RLS decide who someone
  // is (that's auth.uid(), independent of email_confirmed_at) — and this
  // path still requires knowing the account's own chosen password to do
  // anything with it, same as before.
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      full_name: parsed.data.fullName,
      role: parsed.data.role,
      // Read by the handle_new_user() DB trigger, which creates a default
      // `addresses` row alongside the profile for customer signups —
      // see supabase/migrations/0016_signup_default_address.sql.
      ...(parsed.data.role === "customer"
        ? {
            address_line1: parsed.data.addressLine1?.trim(),
            address_line2: parsed.data.addressLine2?.trim() || null,
            address_city: parsed.data.addressCity?.trim(),
            address_state: parsed.data.addressState?.trim(),
            address_postal_code: parsed.data.addressPostalCode?.trim(),
          }
        : {}),
    },
  });

  if (error) {
    // The admin API errors directly on a duplicate email (unlike the public
    // signUp() flow, which stays silent about it for anti-enumeration
    // reasons) — map it to the same friendly message either way.
    if (error.status === 422 || /already been registered|already exists/i.test(error.message)) {
      return { error: "An account with this email already exists. Try logging in instead." };
    }
    return { error: error.message };
  }
  if (!data.user) return { error: "Something went wrong creating your account. Try again." };

  // createUser() only creates the row — establish a real session the same
  // way the rest of the app expects, so signup lands the user straight in
  // the app exactly as it did when email confirmation was in the loop.
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (signInError) return { error: signInError.message };

  return { success: true };
}

const signInSchema = z.object({ email: z.string().email("Enter a valid email address."), password: z.string().min(1, "Enter your password.") });

export async function signIn(input: z.infer<typeof signInSchema>): Promise<ActionResult<{ success: true; role: "customer" | "guy" | "admin" }>> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check your details." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error) return { error: error.message };

  // Resolve the post-login destination server-side, in the same request
  // that already authenticated the user — this avoids a second,
  // client-side round trip (auth.getUser() + a profiles select) purely to
  // decide where to redirect, which was both slower and a needless extra
  // point of failure between "login succeeded" and "landed on the right
  // home surface."
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  const role = profile?.role === "admin" || profile?.role === "guy" ? profile.role : "customer";
  return { success: true, role };
}

const magicLinkSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  next: z.string().optional(),
});

/**
 * Sends a passwordless sign-in link. This is a *sign-in* path only —
 * `shouldCreateUser: false` means an email with no existing account never
 * gets one provisioned this way, so it can't be used to route around the
 * real signup flow (role selection, the customer default-address capture,
 * etc.). The response is always the same generic success regardless of
 * whether the email has an account, matching requestPasswordReset()'s
 * anti-enumeration pattern below — a real send failure (bad email
 * provider, rate limit, "Signups not allowed for otp" for a non-account)
 * is swallowed rather than surfaced, since surfacing it would leak which
 * emails are registered.
 *
 * The redirect target is always this app's own /login page (already on
 * Supabase's Redirect URLs allow list from the signup-confirmation flow),
 * carrying `next` through as a query param so the callback handler there
 * can send the user back to where they started. The destination role
 * (customer/guy/admin home) is never taken from this input — it's resolved
 * from the authenticated user's own `profiles.role` row after the link is
 * clicked, exactly like signIn() below, so a magic link can never be used
 * to land a user somewhere their real role wouldn't otherwise send them.
 */
export async function sendMagicLink(input: z.infer<typeof magicLinkSchema>): Promise<ActionResult> {
  const parsed = magicLinkSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Enter a valid email address." };

  const supabase = await createClient();
  const redirectPath =
    parsed.data.next && isSafeInternalPath(parsed.data.next)
      ? `/login?next=${encodeURIComponent(parsed.data.next)}`
      : "/login";

  await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${SITE_URL}${redirectPath}`,
    },
  });

  return { success: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordReset(email: string): Promise<ActionResult> {
  const parsed = z.string().email("Enter a valid email address.").safeParse(email);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Enter a valid email address." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${SITE_URL}/reset-password`,
  });
  if (error) return { error: error.message };
  return { success: true };
}

export async function updatePassword(newPassword: string): Promise<ActionResult> {
  const parsed = z.string().min(8, "Password must be at least 8 characters").safeParse(newPassword);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Password must be at least 8 characters." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) return { error: error.message };
  return { success: true };
}
