import { describe, it, expect } from "vitest";
import { ok, paginated, errorResponse, okResponse, ERRORS } from "@/lib/api/envelope";

describe("API envelope", () => {
  it("ok() wraps data with ok: true", () => {
    const result = ok({ id: "abc" });
    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ id: "abc" });
  });

  it("okResponse() returns a Response with JSON body", async () => {
    const res = okResponse({ hello: "world" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data).toEqual({ hello: "world" });
  });

  it("paginated() computes totalPages correctly", () => {
    const result = paginated(
      ["a", "b", "c"],
      { page: 1, pageSize: 10, total: 25 },
    );
    expect(result.ok).toBe(true);
    expect(result.data).toEqual(["a", "b", "c"]);
    expect(result.meta?.totalPages).toBe(3);
    expect(result.meta?.page).toBe(1);
  });

  it("paginated() handles total = 0 (at least 1 page)", () => {
    const result = paginated([], { page: 1, pageSize: 20, total: 0 });
    expect(result.meta?.totalPages).toBe(1);
  });

  it("errorResponse() returns correct status + code", async () => {
    const { response, body } = errorResponse(ERRORS.SEAT_UNAVAILABLE, {
      message: "Seat 4B is currently held",
    });
    expect(response.status).toBe(409);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("SEAT_UNAVAILABLE");
    expect(body.error.message).toBe("Seat 4B is currently held");
  });

  it("errorResponse() allows overriding status", () => {
    const { response } = errorResponse(ERRORS.CONFLICT, {
      status: 422,
    });
    expect(response.status).toBe(422);
  });

  it("ERRORS covers all documented error codes", () => {
    const codes = Object.keys(ERRORS);
    expect(codes).toContain("BAD_REQUEST");
    expect(codes).toContain("UNAUTHENTICATED");
    expect(codes).toContain("FORBIDDEN");
    expect(codes).toContain("NOT_FOUND");
    expect(codes).toContain("VALIDATION");
    expect(codes).toContain("CONFLICT");
    expect(codes).toContain("SEAT_UNAVAILABLE");
    expect(codes).toContain("LOCK_EXPIRED");
    expect(codes).toContain("RATE_LIMITED");
    expect(codes).toContain("IDEMPOTENCY");
    expect(codes).toContain("INTERNAL");
  });
});
