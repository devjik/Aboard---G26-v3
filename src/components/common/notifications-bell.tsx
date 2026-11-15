"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, CheckCheck, ShieldCheck, Bus, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";

interface NotificationsBellProps {
  /** Hide the bell when there's no signed-in user. */
  userId?: string | null;
}

/**
 * Notifications bell for the header. Polls the real /api/v1/notifications
 * endpoint, shows an unread badge, and renders a dropdown with the list.
 * On sign-in a real SIGN_IN notification is persisted server-side and
 * appears here within the poll window.
 */
export function NotificationsBell({ userId }: NotificationsBellProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);

  // Poll every 8s while signed in. Disable when not signed in.
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiClient.notifications.list({ page: 1, pageSize: 10 }),
    enabled: !!userId,
    refetchInterval: 8000,
    refetchOnWindowFocus: true,
  });

  // Mark all unread as read
  const markAllRead = useMutation({
    mutationFn: async () => {
      const unread = (data?.items ?? []).filter((n) => n.status !== "READ");
      await Promise.all(unread.map((n) => apiClient.notifications.markRead(n.id)));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("All notifications marked as read");
    },
  });

  // Close popover on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!userId) return null;

  const items = data?.items ?? [];
  const unread = data?.unreadCount ?? 0;

  // Pick an icon for a notification based on its payload kind / type
  const iconFor = (n: (typeof items)[number]) => {
    const payload = n.payload as { kind?: string } | null;
    if (payload?.kind === "SIGN_IN") return <ShieldCheck className="size-4 text-success" />;
    if (n.type === "BOOKING_CONFIRMED") return <Check className="size-4 text-primary" />;
    if (n.type === "TRIP_STARTED" || n.type === "BUS_APPROACHING") return <Bus className="size-4 text-accent" />;
    return <Bell className="size-4 text-muted-foreground" />;
  };

  return (
    <div className="relative" ref={popRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative grid size-9 place-items-center rounded-full text-belt transition-colors hover:bg-muted dark:text-foreground"
      >
        <Bell className="size-[18px]" />
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
              className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white"
            >
              {unread > 9 ? "9+" : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-border bg-card shadow-card"
          >
            {/* header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Bell className="size-4 text-primary" />
                <h3 className="font-display text-sm font-semibold">Notifications</h3>
                {unread > 0 && (
                  <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {unread} new
                  </span>
                )}
              </div>
              <button
                onClick={() => markAllRead.mutate()}
                disabled={unread === 0 || markAllRead.isPending}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                title="Mark all as read"
              >
                <CheckCheck className="size-3.5" />
                Mark all
              </button>
            </div>

            {/* list */}
            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                  <Bell className="size-6 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">No notifications yet</p>
                </div>
              ) : (
                items.map((n) => {
                  const isRead = n.status === "READ";
                  return (
                    <button
                      key={n.id}
                      onClick={async () => {
                        if (!isRead) {
                          await apiClient.notifications.markRead(n.id);
                          qc.invalidateQueries({ queryKey: ["notifications"] });
                        }
                      }}
                      className={cn(
                        "flex w-full items-start gap-2.5 border-b border-border/50 px-4 py-3 text-left transition-colors last:border-0 hover:bg-muted/40",
                        !isRead && "bg-primary/5"
                      )}
                    >
                      <span className="mt-0.5 shrink-0">{iconFor(n)}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn("text-sm", !isRead ? "font-semibold" : "font-medium text-muted-foreground")}>
                            {n.title}
                          </span>
                          {!isRead && <span className="size-2 shrink-0 rounded-full bg-primary" />}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                        <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground/70">
                          <Clock className="size-2.5" />
                          {new Date(n.createdAt).toLocaleString("en-GH", {
                            hour: "2-digit",
                            minute: "2-digit",
                            day: "numeric",
                            month: "short",
                            hour12: false,
                          })}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* footer hint */}
            <div className="border-t border-border bg-muted/30 px-4 py-2 text-center text-[10px] text-muted-foreground">
              In-app notifications · SMS reserved for parents (Phase 2)
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
