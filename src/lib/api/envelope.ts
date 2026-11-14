// JSON API envelope for Aboard.
// All API routes return either ApiOk<T> or ApiErr.

export interface ApiMeta {
  requestId?: string;
  correlationId?: string;
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
  [key: string]: unknown;
}

export interface ApiOk<T> {
  ok: true;
  data: T;
  meta?: ApiMeta;
}

export interface ApiErr {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    [key: string]: unknown;
  };
  meta?: ApiMeta;
}

export type ApiResult<T> = ApiOk<T> | ApiErr;

export function ok<T>(data: T, meta?: ApiMeta): ApiOk<T> {
  return { ok: true, data, meta };
}

export function paginated<T>(
  items: T[],
  opts: { page: number; pageSize: number; total: number },
  metaExtra?: ApiMeta,
): ApiOk<T[]> {
  const totalPages = Math.max(1, Math.ceil(opts.total / opts.pageSize));
  return {
    ok: true,
    data: items,
    meta: {
      page: opts.page,
      pageSize: opts.pageSize,
      total: opts.total,
      totalPages,
      ...metaExtra,
    },
  };
}

export interface ErrorDef {
  code: string;
  status: number;
  message: string;
}

export const ERRORS = {
  BAD_REQUEST: { code: "BAD_REQUEST", status: 400, message: "Bad request" },
  UNAUTHENTICATED: {
    code: "UNAUTHENTICATED",
    status: 401,
    message: "Authentication required",
  },
  FORBIDDEN: { code: "FORBIDDEN", status: 403, message: "Forbidden" },
  NOT_FOUND: { code: "NOT_FOUND", status: 404, message: "Not found" },
  VALIDATION: {
    code: "VALIDATION",
    status: 422,
    message: "Validation failed",
  },
  CONFLICT: { code: "CONFLICT", status: 409, message: "Conflict" },
  SEAT_UNAVAILABLE: {
    code: "SEAT_UNAVAILABLE",
    status: 409,
    message: "Seat no longer available",
  },
  LOCK_EXPIRED: {
    code: "LOCK_EXPIRED",
    status: 410,
    message: "Seat lock expired",
  },
  RATE_LIMITED: {
    code: "RATE_LIMITED",
    status: 429,
    message: "Too many requests",
  },
  IDEMPOTENCY: {
    code: "IDEMPOTENCY",
    status: 409,
    message: "Idempotency conflict",
  },
  INTERNAL: { code: "INTERNAL", status: 500, message: "Internal error" },
} as const;

export type ErrorCode = keyof typeof ERRORS;

export function errorResponse(
  def: ErrorDef,
  overrides?: Partial<{
    message: string;
    details: unknown;
    status: number;
    meta: ApiMeta;
    code: string;
  }>,
): { response: Response; body: ApiErr } {
  const body: ApiErr = {
    ok: false,
    error: {
      code: overrides?.code ?? def.code,
      message: overrides?.message ?? def.message,
      ...(overrides?.details ? { details: overrides.details } : {}),
    },
    ...(overrides?.meta ? { meta: overrides.meta } : {}),
  };
  const response = Response.json(body, {
    status: overrides?.status ?? def.status,
  });
  return { response, body };
}

export function okResponse<T>(data: T, meta?: ApiMeta): Response {
  return Response.json(ok(data, meta));
}

export function paginatedResponse<T>(
  items: T[],
  opts: { page: number; pageSize: number; total: number },
  metaExtra?: ApiMeta,
): Response {
  return Response.json(paginated(items, opts, metaExtra));
}
