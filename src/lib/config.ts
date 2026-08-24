export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const SITE_NAME = "I Gotta Guy";
export const SITE_TAGLINE = "Need something done? We got a guy.";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://igottaguy.com";
