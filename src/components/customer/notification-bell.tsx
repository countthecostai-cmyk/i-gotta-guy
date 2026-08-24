"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "./format";

interface NotificationRow {
  id: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
  data: Record<string, unknown>;
}

export function NotificationBell({ initialUnreadCount }: { initialUnreadCount: number }) {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [notifications, setNotifications] = useState<NotificationRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function handleOpen() {
    const next = !open;
    setOpen(next);
    if (next && notifications === null) {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("notifications")
        .select("id, title, body, read_at, created_at, data")
        .order("created_at", { ascending: false })
        .limit(15);
      setNotifications(data ?? []);
      setLoading(false);
    }
  }

  async function markAllRead() {
    if (!notifications || notifications.every((n) => n.read_at)) return;
    const supabase = createClient();
    const unreadIds = notifications.filter((n) => !n.read_at).map((n) => n.id);
    setNotifications((prev) => prev?.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })) ?? prev);
    setUnreadCount(0);
    if (unreadIds.length) {
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", unreadIds);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Notifications"
        className="tap-target relative flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-ink/5"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-2xl border border-line bg-paper-raised shadow-lg">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-display text-sm font-semibold text-ink">Notifications</p>
            {notifications && notifications.some((n) => !n.read_at) && (
              <button type="button" onClick={markAllRead} className="text-xs font-medium text-brand hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading && <p className="px-4 py-6 text-center text-sm text-ink-soft">Loading…</p>}
            {!loading && notifications && notifications.length === 0 && (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <Inbox className="h-6 w-6 text-ink-soft" />
                <p className="text-sm text-ink-soft">Nothing yet. We&apos;ll let you know when something happens.</p>
              </div>
            )}
            {!loading &&
              notifications?.map((n) => (
                <div
                  key={n.id}
                  className={cn("border-b border-line px-4 py-3 last:border-b-0", !n.read_at && "bg-brand-light/40")}
                >
                  <p className="text-sm font-medium text-ink">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-sm text-ink-soft">{n.body}</p>}
                  <p className="mt-1 text-xs text-ink-soft/70">{formatRelativeTime(n.created_at)}</p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
