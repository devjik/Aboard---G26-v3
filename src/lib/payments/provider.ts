import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";

export interface InitiateInput {
  bookingId: string;
  amountPesewa: number;
  idempotencyKey: string;
  payerUserId: string;
  payerRole: string;
  provider?: string;
}

export interface InitiateResult {
  paymentId: string;
  providerRef: string;
  status: string;
  devConfirmToken?: string;
}

export interface VerifyWebhookInput {
  rawBody: string;
  signature: string;
  provider?: string;
}

export interface VerifyWebhookResult {
  ok: boolean;
  event?: string;
  providerRef?: string;
  amountPesewa?: number;
  raw?: unknown;
}

export interface RefundInput {
  paymentId: string;
  amountPesewa: number;
  reason: string;
}

export interface RefundResult {
  ok: boolean;
  providerRef?: string;
  amount?: number;
}

export interface PaymentProvider {
  name: string;
  initiate(input: InitiateInput): Promise<InitiateResult>;
  verifyWebhook(input: VerifyWebhookInput): VerifyWebhookResult;
  refund(input: RefundInput): Promise<RefundResult>;
}

function sandboxKey(): string {
  return (
    process.env.ABOARD_PAYMENT_SANDBOX_KEY ||
    "aboard-sandbox-secret-dev-only"
  );
}

/**
 * Dev sandbox provider: signs an HMAC-SHA256 over the payload and stores
 * the payment record as PENDING. In production this would call a real
 * payment gateway (Hubtel / MTN MoMo / Vodafone Cash).
 */
export const sandboxProvider: PaymentProvider = {
  name: "SANDBOX",

  async initiate(input: InitiateInput): Promise<InitiateResult> {
    const providerRef = `SAN-${randomBytes(6).toString("hex").toUpperCase()}`;
    const devConfirmToken = `CONFIRM-${randomBytes(8).toString("hex")}`;
    const payment = await db.payment.create({
      data: {
        bookingId: input.bookingId,
        provider: input.provider ?? "SANDBOX",
        providerRef,
        status: "PENDING",
        amountPesewa: input.amountPesewa,
        idempotencyKey: input.idempotencyKey,
      },
    });
    return {
      paymentId: payment.id,
      providerRef,
      status: payment.status,
      devConfirmToken,
    };
  },

  verifyWebhook(input: VerifyWebhookInput): VerifyWebhookResult {
    const expected = createHmac("sha256", sandboxKey())
      .update(input.rawBody)
      .digest("hex");
    if (
      expected.length !== input.signature.length ||
      !timingSafeEqual(Buffer.from(expected), Buffer.from(input.signature))
    ) {
      return { ok: false };
    }
    try {
      const payload = JSON.parse(input.rawBody);
      return {
        ok: true,
        event: payload.event,
        providerRef: payload.providerRef,
        amountPesewa: payload.amountPesewa,
        raw: payload,
      };
    } catch {
      return { ok: false };
    }
  },

  async refund(input: RefundInput): Promise<RefundResult> {
    const providerRef = `REF-${randomBytes(6).toString("hex").toUpperCase()}`;
    return { ok: true, providerRef, amount: input.amountPesewa };
  },
};

export const activePaymentProvider: PaymentProvider = sandboxProvider;
