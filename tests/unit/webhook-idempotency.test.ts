import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { sandboxProvider } from "@/lib/payments/provider";

const SANDBOX_KEY = "aboard-sandbox-secret-dev-only";

function sign(rawBody: string): string {
  return createHmac("sha256", SANDBOX_KEY).update(rawBody).digest("hex");
}

describe("Payment webhook — idempotency + signature verification", () => {
  it("verifies a correctly signed webhook", () => {
    const raw = JSON.stringify({
      event: "payment.success",
      providerRef: "SAN-ABC123",
      amountPesewa: 4500,
    });
    const result = sandboxProvider.verifyWebhook({
      rawBody: raw,
      signature: sign(raw),
    });
    expect(result.ok).toBe(true);
    expect(result.event).toBe("payment.success");
    expect(result.providerRef).toBe("SAN-ABC123");
    expect(result.amountPesewa).toBe(4500);
  });

  it("rejects a webhook with a wrong signature (forgery)", () => {
    const raw = JSON.stringify({ event: "payment.success", providerRef: "SAN-X" });
    const result = sandboxProvider.verifyWebhook({
      rawBody: raw,
      signature: "deadbeef".repeat(8),
    });
    expect(result.ok).toBe(false);
    expect(result.event).toBeUndefined();
  });

  it("rejects a webhook with a signature from a different secret", () => {
    const raw = JSON.stringify({ event: "payment.success" });
    const wrongSig = createHmac("sha256", "wrong-secret")
      .update(raw)
      .digest("hex");
    const result = sandboxProvider.verifyWebhook({
      rawBody: raw,
      signature: wrongSig,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a webhook with malformed JSON body", () => {
    const raw = "not-json";
    const result = sandboxProvider.verifyWebhook({
      rawBody: raw,
      signature: sign(raw),
    });
    expect(result.ok).toBe(false);
  });

  it("is timing-safe — equal-length wrong signatures still rejected", () => {
    const raw = JSON.stringify({ event: "payment.success" });
    const correctSig = sign(raw);
    // Same length, different content — must still reject (timing-safe compare)
    const tamperedSig = correctSig.replace(/^./, correctSig[1]) // swap first char
      .replace(/.$/, "0");
    const result = sandboxProvider.verifyWebhook({
      rawBody: raw,
      signature: tamperedSig,
    });
    expect(result.ok).toBe(false);
  });

  it("handles duplicate webhook events identically (idempotency contract)", () => {
    // The sandbox provider is stateless — idempotency is enforced at the
    // route layer via the webhook_events table + payment idempotency_key.
    // This test verifies the provider returns the same parsed result for
    // the same raw body + signature, so the route layer can dedupe safely.
    const raw = JSON.stringify({
      event: "payment.success",
      providerRef: "SAN-DUP-001",
      amountPesewa: 5000,
    });
    const sig = sign(raw);
    const r1 = sandboxProvider.verifyWebhook({ rawBody: raw, signature: sig });
    const r2 = sandboxProvider.verifyWebhook({ rawBody: raw, signature: sig });
    expect(r1).toEqual(r2);
    expect(r1.ok).toBe(true);
  });

  it("handles out-of-order events independently", () => {
    // Webhooks may arrive out of order (e.g., refund before payment.success).
    // The provider parses each independently; ordering is the route's job.
    const events = [
      { event: "payment.pending", providerRef: "SAN-OOO-1" },
      { event: "payment.success", providerRef: "SAN-OOO-1" },
      { event: "refund.completed", providerRef: "SAN-OOO-1" },
    ];
    for (const e of events) {
      const raw = JSON.stringify(e);
      const result = sandboxProvider.verifyWebhook({
        rawBody: raw,
        signature: sign(raw),
      });
      expect(result.ok).toBe(true);
      expect(result.event).toBe(e.event);
    }
  });
});
