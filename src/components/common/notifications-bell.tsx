"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, CheckCheck, ShieldCheck, Bus, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";

interface NotificationsBellProps {
  userId?: string | null;
}

/**
 * Notifications bell — floating popup panel (like the trip list on the map).
 *
 * One panel for all screen sizes. Positioned absolute right-0 below the bell.
 * Closable via X button, backdrop tap, or Escape key.
 * No bottom sheet, no full-screen overlay — just a compact popup.
 */
export function NotificationsBell({ userId }: NotificationsBellProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiClient.notifications.list({ page: 1, pageSize: 10 }),
    enabled: !!userId,
    refetchInterval: 8000,
    refetchOnWindowFocus: true,
  });

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

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!userId) return null;

  const items = data?.items ?? [];
  const unread = data?.unreadCount ?? 0;

  const iconFor = (n: (typeof items)[number]) => {
    const payload = n.payload as { kind?: string } | null;
    if (payload?.kind === "SIGN_IN") return <ShieldCheck className="size-4 text-success" />;
    if (n.type === "BOOKING_CONFIRMED") return <Check className="size-4 text-primary" />;
    if (n.type === "TRIP_STARTED" || n.type === "BUS_APPROACHING") return <Bus className="size-4 text-accent" />;
    return <Bell className="size-4 text-muted-foreground" />;
  };

  return (
    <div className="relative" ref={popRef}>
      {/* Bell button */}
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

      {/* Popup panel — works on ALL screen sizes */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop — tap anywhere outside the panel to close */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            />

            {/* Floating panel — positioned below the bell, like the trip list */}
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="fixed right-3 top-16 z-50 mt-2 w-72 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-border bg-card shadow-card sm:absolute sm:right-0 sm:top-full sm:w-80"
            >
              {/* Header — with close button */}
              <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <Bell className="size-4 text-primary" />
                  <h3 className="font-display text-sm font-semibold">Notifications</h3>
                  {unread > 0 && (
                    <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {unread} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => markAllRead.mutate()}
                    disabled={unread === 0 || markAllRead.isPending}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                    title="Mark all as read"
                  >
                    <CheckCheck className="size-3.5" />
                    <span className="hidden sm:inline">Mark all</span>
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    className="grid size-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="Close notifications"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>

              {/* List — scrollable, capped height */}
              <div className="max-h-[60vh] overflow-y-auto">
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
                          !isRead && "bg-primary/5",
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

              {/* Footer */}
              <div className="shrink-0 border-t border-border bg-muted/30 px-4 py-2 text-center text-[10px] text-muted-foreground">
                In-app notifications · SMS reserved for parents (Phase 2)
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
