"use client";

import type {
  AuthUserT,
  OtpRequestT,
  OtpVerifyT,
  PasswordLoginT,
  StudentRegisterT,
} from "@/lib/api/contracts/auth";
import type { TripSummaryT } from "@/lib/api/contracts/trips";

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  meta?: Record<string, unknown>;
  constructor(opts: {
    status: number;
    code: string;
    message: string;
    details?: unknown;
    meta?: Record<string, unknown>;
  }) {
    super(opts.message);
    this.status = opts.status;
    this.code = opts.code;
    this.details = opts.details;
    this.meta = opts.meta;
    this.name = "ApiError";
  }
}

function correlationId(): string {
  return `corr_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function isRetryableStatus(status: number): boolean {
  return status >= 500 || status === 429;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

interface DoFetchOpts {
  method?: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
  body?: unknown;
  query?: Record<string, string | number | undefined | null>;
  headers?: Record<string, string>;
  retries?: number;
  signal?: AbortSignal;
}

async function refreshAccessToken(): Promise<boolean> {
  try {
    const res = await fetch("/api/v1/auth/refresh", {
      method: "POST",
      credentials: "include",
      headers: { "x-correlation-id": correlationId() },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function doFetch<T>(
  path: string,
  opts: DoFetchOpts = {},
): Promise<T> {
  const {
    method = "GET",
    body,
    query,
    headers = {},
    retries = 2,
    signal,
  } = opts;
  const url = new URL(path, window.location.origin);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }

  let attempt = 0;
  let lastErr: unknown = null;
  while (attempt <= retries) {
    try {
      const res = await fetch(url.toString(), {
        method,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-correlation-id": correlationId(),
          ...headers,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal,
      });
      if (res.status === 401 && attempt === 0 && method !== "GET") {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          attempt += 1;
          continue;
        }
      }
      if (res.status === 401 && method === "GET" && attempt === 0) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          attempt += 1;
          continue;
        }
      }
      const text = await res.text();
      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }
      if (!res.ok) {
        if (isRetryableStatus(res.status) && attempt < retries) {
          await delay(400 * Math.pow(2, attempt));
          attempt += 1;
          continue;
        }
        const err = json?.error ?? {};
        throw new ApiError({
          status: res.status,
          code: err.code ?? "HTTP_ERROR",
          message: err.message ?? res.statusText ?? "Request failed",
          details: err.details,
          meta: json?.meta,
        });
      }
      return (json?.data ?? json) as T;
    } catch (e) {
      if (e instanceof ApiError) throw e;
      lastErr = e;
      if (attempt < retries) {
        await delay(400 * Math.pow(2, attempt));
        attempt += 1;
        continue;
      }
      throw new ApiError({
        status: 0,
        code: "NETWORK_ERROR",
        message:
          e instanceof Error ? e.message : "Network error",
      });
    }
  }
  throw new ApiError({
    status: 0,
    code: "RETRIES_EXHAUSTED",
    message: "Retries exhausted",
  });
}

export const api = {
  get: <T>(path: string, query?: DoFetchOpts["query"]) =>
    doFetch<T>(path, { method: "GET", query }),
  post: <T>(path: string, body?: unknown) =>
    doFetch<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) =>
    doFetch<T>(path, { method: "PATCH", body }),
  put: <T>(path: string, body?: unknown) =>
    doFetch<T>(path, { method: "PUT", body }),
  delete: <T>(path: string) => doFetch<T>(path, { method: "DELETE" }),
};

// ---------------------------------------------------------------------------
// Typed API client
// ---------------------------------------------------------------------------

export interface DashboardData {
  totalBookings: number;
  totalRevenue: string;
  activeRoutes: number;
  confirmedToday: number;
  chartData: Array<{ label: string; bookings: number; revenue: number }>;
  recentBookings: Array<{
    id: string;
    amountPesewa: number;
    status: string;
    createdAt: string;
    studentName: string;
    seatLabel: string;
    routeLabel: string;
    departureAt: string;
  }>;
  routesFill: Array<{
    tripId: string;
    routeLabel: string;
    departureAt: string;
    capacity: number;
    booked: number;
    fillPct: number;
  }>;
}

export interface AdminBooking {
  id: string;
  status: string;
  amountPesewa: number;
  createdAt: string;
  payerRole: string;
  trip?: {
    id: string;
    departureAt: string;
    route: { originName: string; destName: string };
  };
  student?: { user: { name: string; phone: string } };
  seat?: { label: string };
}

export interface AdminRoute {
  id: string;
  originName: string;
  originRegion: string;
  destName: string;
  destRegion: string;
  distanceKm: number;
  durationMin: number;
  active: boolean;
  stops: Array<{ name: string; region: string; type: string }>;
  tripCount: number;
}

export interface PaymentInitiateResponse {
  paymentId: string;
  providerRef: string;
  status: string;
  devConfirmToken?: string;
}

export const apiClient = {
  auth: {
    me: () => api.get<AuthUserT>("/api/v1/auth/me"),
    otpRequest: (body: OtpRequestT) =>
      api.post<{ otpSent: boolean; devCode?: string }>(
        "/api/v1/auth/otp/request",
        body,
      ),
    otpVerify: (body: OtpVerifyT) =>
      api.post<{ user: AuthUserT }>("/api/v1/auth/otp/verify", body),
    emailOtpRequest: (body: { email: string }) =>
      api.post<{ otpSent: boolean; channel: string; devCode?: string }>(
        "/api/v1/auth/email-otp/request",
        body,
      ),
    emailOtpVerify: (body: { email: string; code: string }) =>
      api.post<{ user: AuthUserT }>("/api/v1/auth/email-otp/verify", body),
    login: (body: PasswordLoginT) =>
      api.post<{ user: AuthUserT }>("/api/v1/auth/login", body),
    register: (body: StudentRegisterT) =>
      api.post<{ user: AuthUserT }>("/api/v1/auth/register", body),
    logout: () => api.post<{ ok: boolean }>("/api/v1/auth/logout"),
  },
  trips: {
    search: (query: Record<string, string | number | undefined>) =>
      api.get<{ items: TripSummaryT[]; total: number }>(
        "/api/v1/trips/search",
        query,
      ),
    detail: (id: string) => api.get<any>(`/api/v1/trips/${id}`),
    seats: (id: string) =>
      api.get<{
        tripId: string;
        basePricePesewa: number;
        seats: Array<{
          id: string;
          label: string;
          row: number;
          col: number;
          status: string;
          pricePesewa: number;
        }>;
      }>(`/api/v1/trips/${id}/seats`),
    holdSeat: (body: { tripId: string; seatLabel: string }) =>
      api.post<{
        lockId: string;
        seatLabel: string;
        expiresAt: string;
        pricePesewa: number;
      }>("/api/v1/trips/hold", body),
    releaseHold: (lockId: string) =>
      api.post<{ ok: boolean }>(`/api/v1/trips/hold/${lockId}/release`),
  },
  meta: {
    health: () => api.get<{ status: string; db: string; ts: string }>(
      "/api/v1/health",
    ),
    ready: () => api.get<{ status: string }>("/api/v1/ready"),
  },
  admin: {
    dashboard: () => api.get<DashboardData>("/api/v1/admin/dashboard"),
    bookings: (query: Record<string, string | number | undefined>) =>
      api.get<{
        items: AdminBooking[];
        counts: Record<string, number>;
        page: number;
        pageSize: number;
        total: number;
      }>("/api/v1/admin/bookings", query),
    routes: () => api.get<{ items: AdminRoute[] }>("/api/v1/admin/routes"),
  },
  payments: {
    initiate: (body: {
      bookingIntentId: string;
      tripId: string;
      seatLabel: string;
      amountPesewa: number;
      payerRole: string;
      idempotencyKey: string;
    }) => api.post<PaymentInitiateResponse>("/api/v1/payments/initiate", body),
  },
  notifications: {
    list: (q?: { page?: number; pageSize?: number }) =>
      api.get<{
        items: {
          id: string;
          channel: string;
          type: string;
          title: string;
          body: string;
          payload: unknown;
          status: string;
          createdAt: string;
          readAt: string | null;
        }[];
        unreadCount: number;
        total: number;
        page: number;
        pageSize: number;
      }>("/api/v1/notifications", q),
    markRead: (id: string) =>
      api.post<{ id: string; status: string; readAt: string | null }>(`/api/v1/notifications/${id}/read`),
  },
};
