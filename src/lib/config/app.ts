export const APP_NAME = "Aboard";
export const APP_TAGLINE = "Get on board. Know you arrived.";
export const APP_DESCRIPTION =
  "Inter-city student bus booking & live tracking for Ghana.";
export const CURRENCY = "GHS";
export const CURRENCY_SYMBOL = "GH₵";
export const PILOT_CAMPUS = "University of Cape Coast";
export const PILOT_REGION = "Central";
export const COUNTRY = "Ghana";
export const PESAWA_PER_GHS = 100;
export const SEAT_HOLD_TTL_MS = 5 * 60 * 1000;
export const LOCK_EXPIRY_INTERVAL_MS = 30 * 1000;
export const LOCATION_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
export const GPS_INTERVAL_MS = 4000;
export const SESSION_TTL_MS = 60 * 60 * 1000;
export const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const REFUND_POLICY = {
  FREE_BEFORE_MS: 2 * 60 * 60 * 1000,
  PARTIAL_BEFORE_MS: 30 * 60 * 1000,
  FULL_FRACTION: 1.0,
  PARTIAL_FRACTION: 0.5,
  NONE_FRACTION: 0,
  OPERATOR_CANCEL_FRACTION: 1.0,
} as const;
export const NOTIFICATION_CHANNELS = {
  IN_APP: true,
  SMS: false,
  EMAIL: false,
  PUSH: true,
} as const;
export const TRACKING_SERVICE_PORT = 3003;
export const PRIVACY_LAW = "Ghana Data Protection Act, 2012 (Act 843)";

export function formatGHS(pesewa: number): string {
  const ghs = pesewa / PESAWA_PER_GHS;
  return `${CURRENCY_SYMBOL}${ghs.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatGHSPlain(pesewa: number): string {
  const ghs = pesewa / PESAWA_PER_GHS;
  return `${ghs.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
