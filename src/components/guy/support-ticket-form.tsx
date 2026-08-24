"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupportTicket } from "@/lib/actions/support";
import { useServerAction } from "./hooks";
import { ErrorBanner, SuccessBanner } from "./error-banner";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/primitives";

export function SupportTicketForm() {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { run, pending, error } = useServerAction(createSupportTicket);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = await run({ subject, body, jobId: null });
    if (result) {
      setSubject("");
      setBody("");
      setSubmitted(true);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ErrorBanner message={error} />
      {submitted && <SuccessBanner message="Your ticket was submitted — we'll get back to you soon." />}
      <div>
        <Label htmlFor="subject">Subject</Label>
        <Input
          id="subject"
          value={subject}
          onChange={(e) => {
            setSubject(e.target.value);
            setSubmitted(false);
          }}
          maxLength={200}
          required
        />
      </div>
      <div>
        <Label htmlFor="body">How can we help?</Label>
        <Textarea
          id="body"
          rows={5}
          maxLength={4000}
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            setSubmitted(false);
          }}
          required
        />
      </div>
      <Button type="submit" variant="primary" size="md" disabled={pending}>
        {pending ? "Sending…" : "Submit ticket"}
      </Button>
    </form>
  );
}
