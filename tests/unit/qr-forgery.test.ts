import { describe, it, expect } from "vitest";
import { signTicket, verifyTicket, type TicketPayload } from "@/lib/tickets/signer";

describe("QR ticket signer — forgery + replay resistance", () => {
  const basePayload: TicketPayload = {
    bookingId: "bk_abc123",
    tripId: "tp_xyz789",
    seatLabel: "4B",
    studentId: "st_001",
    studentName: "Kwesi Mensah",
    route: "Cape Coast → Accra",
    departureAt: new Date("2026-12-01T06:00:00Z").toISOString(),
    expiry: new Date("2026-12-01T06:00:00Z").getTime().toString(),
    version: 1,
  };

  it("signs and verifies a valid payload", () => {
    const token = signTicket(basePayload);
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    const verified = verifyTicket(token);
    expect(verified).not.toBeNull();
    expect(verified?.bookingId).toBe(basePayload.bookingId);
    expect(verified?.seatLabel).toBe("4B");
  });

  it("rejects a tampered payload (forgery)", () => {
    const token = signTicket(basePayload);
    // Tamper: change the seat label from 4B to 1A by decoding, modifying, re-encoding the body
    const [body, sig] = token.split(".");
    const decoded = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as TicketPayload;
    const forged: TicketPayload = { ...decoded, seatLabel: "1A" };
    const forgedBody = Buffer.from(JSON.stringify(forged)).toString("base64url");
    const forgedToken = `${forgedBody}.${sig}`; // keep original signature
    const verified = verifyTicket(forgedToken);
    expect(verified).toBeNull();
  });

  it("rejects a token with a forged signature", () => {
    const token = signTicket(basePayload);
    const [body, _originalSig] = token.split(".");
    // Forge a signature with a different secret
    const fakeSig = Buffer.from("fakesignaturefakesignaturefakesig")
      .toString("base64url");
    const forgedToken = `${body}.${fakeSig}`;
    const verified = verifyTicket(forgedToken);
    expect(verified).toBeNull();
  });

  it("rejects a malformed token (not two parts)", () => {
    expect(verifyTicket("not-a-token")).toBeNull();
    expect(verifyTicket("a.b.c")).toBeNull();
    expect(verifyTicket("")).toBeNull();
  });

  it("rejects a token with corrupted body JSON", () => {
    const fakeBody = Buffer.from("not json").toString("base64url");
    const fakeSig = Buffer.from("fakesig").toString("base64url");
    expect(verifyTicket(`${fakeBody}.${fakeSig}`)).toBeNull();
  });

  it("is deterministic — same payload produces same token", () => {
    const t1 = signTicket(basePayload);
    const t2 = signTicket(basePayload);
    expect(t1).toBe(t2);
  });

  it("different payloads produce different tokens", () => {
    const t1 = signTicket(basePayload);
    const t2 = signTicket({ ...basePayload, seatLabel: "5C" });
    expect(t1).not.toBe(t2);
  });

  it("version field distinguishes re-issued tickets", () => {
    const v1 = signTicket({ ...basePayload, version: 1 });
    const v2 = signTicket({ ...basePayload, version: 2 });
    expect(v1).not.toBe(v2);
    expect(verifyTicket(v1)?.version).toBe(1);
    expect(verifyTicket(v2)?.version).toBe(2);
  });
});
