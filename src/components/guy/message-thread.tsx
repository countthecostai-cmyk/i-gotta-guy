"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { sendMessage, markMessagesRead } from "@/lib/actions/messages";
import { useServerAction } from "./hooks";
import { ErrorBanner } from "./error-banner";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "./format";
import { cn } from "@/lib/utils";

export interface ThreadMessage {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export function MessageThread({
  jobId,
  messages,
  currentUserId,
}: {
  jobId: string;
  messages: ThreadMessage[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const { run, pending, error } = useServerAction(sendMessage);

  useEffect(() => {
    markMessagesRead(jobId);
  }, [jobId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    const result = await run({ jobId, body });
    if (result) {
      setBody("");
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {messages.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line py-6 text-center text-sm text-ink-soft">
          No messages yet. Say hello!
        </p>
      ) : (
        <div className="max-h-80 space-y-2 overflow-y-auto rounded-xl border border-line bg-paper p-3">
          {messages.map((m) => {
            const mine = m.sender_id === currentUserId;
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm",
                    mine ? "bg-brand text-white" : "bg-ink/5 text-ink",
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={cn("mt-1 text-[10px]", mine ? "text-white/70" : "text-ink-soft")}>
                    {formatDateTime(m.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <ErrorBanner message={error} />
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Message the customer…"
          maxLength={4000}
          className="tap-target flex-1 rounded-full border border-line bg-paper-raised px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
        />
        <Button type="submit" size="md" disabled={pending || !body.trim()} aria-label="Send message">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
