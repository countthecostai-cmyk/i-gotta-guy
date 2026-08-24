"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Next.js redacts the message of any *thrown* Server Action error in
// production builds (to avoid leaking internals), which meant real,
// user-facing validation messages (bad password, wrong credentials, email
// already registered, etc.) were replaced with a generic "Server Components
// render" error on the client. Returning a typed result instead of throwing
// keeps these expected, safe-to-show messages intact end to end.
export type ActionResult<T = { success: true }> = { error: string } | T;

const signUpSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(1, "Enter your name.").max(120),
  role: z.enum(["customer", "guy"]).default("customer"),
});

export async function signUp(input: z.infer<typeof signUpSchema>): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check your details." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.fullName, role: parsed.data.role } },
  });
  if (error) return { error: error.message };

  // With email confirmation on, Supabase returns success (no `error`) for
  // an already-registered email too — to avoid leaking which emails have
  // accounts, it just doesn't send a second confirmation email. The one
  // reliable signal is an empty `identities` array on a "new" user. Without
  // this check the UI shows a false "check your email" success, and the
  // real account holder never learns they should log in instead.
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return { error: "An account with this email already exists. Try logging in instead." };
  }
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
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/reset-password`,
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
