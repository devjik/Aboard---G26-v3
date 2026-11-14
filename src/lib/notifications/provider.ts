import { db } from "@/lib/db";
import type { Notification as NotificationRow } from "@prisma/client";

export type NotificationChannel = "IN_APP" | "SMS" | "EMAIL" | "PUSH";

export interface SendInput {
  userId: string;
  channel: NotificationChannel;
  type: string;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
}

export interface NotificationProvider {
  name: string;
  send(input: SendInput): Promise<{ ok: boolean; id?: string; error?: string }>;
}

type Listener = (row: NotificationRow) => void;
const listeners = new Set<Listener>();

export const notificationEmitter = {
  on(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  emit(row: NotificationRow): void {
    for (const l of listeners) {
      try {
        l(row);
      } catch {
        // ignore listener errors
      }
    }
  },
};

export const inAppProvider: NotificationProvider = {
  name: "IN_APP",
  async send(input: SendInput) {
    try {
      const row = await db.notification.create({
        data: {
          userId: input.userId,
          channel: input.channel,
          type: input.type,
          title: input.title,
          body: input.body,
          payload: input.payload ? JSON.stringify(input.payload) : null,
          status: "SENT",
          sentAt: new Date(),
        },
      });
      notificationEmitter.emit(row);
      return { ok: true, id: row.id };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Unknown error",
      };
    }
  },
};

export const activeNotificationProvider: NotificationProvider = inAppProvider;
