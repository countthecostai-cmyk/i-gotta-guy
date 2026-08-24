"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Card, Input, Textarea, Label } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { createSupportTicket } from "@/lib/actions/support";
import { ActionError } from "@/lib/actions/errors";

export function SupportTicketForm({ jobId }: { jobId: string | null }) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) {
      setError("Please fill in both fields.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createSupportTicket({ subject: subject.trim(), body: body.trim(), jobId });
      setSubmitted(true);
      setSubject("");
      setBody("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ActionError ? err.message : "Couldn't submit your ticket. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        {jobId && (
          <p className="rounded-lg bg-brand-light/50 px-3 py-2 text-xs font-medium text-brand-dark">
            This ticket will be linked to your job.
          </p>
        )}
        <div>
          <Label htmlFor="subject">Subject</Label>
          <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What's going on?" />
        </div>
        <div>
          <Label htmlFor="body">Details</Label>
          <Textarea id="body" rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Tell us more…" />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        {submitted && <p className="text-sm text-trust-dark">Ticket submitted — we&apos;ll get back to you soon.</p>}
        <Button type="submit" disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit ticket"}
        </Button>
      </form>
    </Card>
  );
}
