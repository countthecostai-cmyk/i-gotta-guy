import Link from "next/link";
import { Card } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Almost there", robots: { index: false, follow: false } };

export default function SetupRequiredPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <Card className="w-full p-8">
        <h1 className="font-display text-2xl font-bold text-ink">Almost there</h1>
        <p className="mt-3 text-[15px] text-ink-soft">
          I Gotta Guy is built and ready — it just isn&apos;t connected to a live database yet.
          Once a Supabase project is configured (<code className="rounded bg-ink/5 px-1.5 py-0.5 text-sm">NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
          <code className="rounded bg-ink/5 px-1.5 py-0.5 text-sm">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, and{" "}
          <code className="rounded bg-ink/5 px-1.5 py-0.5 text-sm">SUPABASE_SERVICE_ROLE_KEY</code>) and the
          migrations in <code className="rounded bg-ink/5 px-1.5 py-0.5 text-sm">supabase/migrations</code> are
          applied, accounts, requests, and jobs will work end to end.
        </p>
        <div className="mt-6">
          <Link href="/">
            <Button variant="outline">Back to home</Button>
          </Link>
        </div>
      </Card>
    </main>
  );
}
