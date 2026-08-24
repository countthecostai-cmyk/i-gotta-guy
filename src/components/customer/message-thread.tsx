"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/primitives";
import { sendMessage, markMessagesRead } from "@/lib/actions/messages";
import { ActionError } from "@/lib/actions/errors";
import { formatRelativeTime } from "./format";

export interface MessageData {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export function MessageThread({
  jobId,
  currentUserId,
  messages,
  guyAssigned,
}: {
  jobId: string;
  currentUserId: string;
  messages: MessageData[];
  guyAssigned: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    markMessagesRead(jobId);
  }, [jobId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function handleSend() {
    const trimmed = body.trim();
    if (!trimmed) return;
    setSending(true);
    setError(null);
    try {
      await sendMessage({ jobId, body: trimmed });
      setBody("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ActionError ? err.message : "Message couldn't be sent. Please try again.");
    } finally {
      setSending(false);
    }
  }

  if (!guyAssigned) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line px-4 py-8 text-center">
        <MessageCircle className="h-5 w-5 text-ink-soft" />
        <p className="text-sm text-ink-soft">You&apos;ll be able to message your Guy once one is assigned to this job.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="max-h-80 space-y-3 overflow-y-auto rounded-xl border border-line bg-paper p-3">
        {messages.length === 0 && (
          <p className="py-6 text-center text-sm text-ink-soft">Say hi — messages here go straight to your Guy.</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === currentUserId;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm",
                  mine ? "bg-brand text-white" : "bg-paper-raised border border-line text-ink",
                )}
              >
                <p>{m.body}</p>
                <p className={cn("mt-1 text-[11px]", mine ? "text-white/70" : "text-ink-soft/70")}>
                  {formatRelativeTime(m.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <div className="mt-2 flex items-end gap-2">
        <Textarea
          rows={1}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type a message…"
          className="flex-1"
        />
        <Button size="md" onClick={handleSend} disabled={sending || !body.trim()} aria-label="Send message">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
