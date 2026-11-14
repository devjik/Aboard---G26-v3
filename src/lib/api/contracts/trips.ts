import { z } from "zod";
import { RegionNameSchema } from "./common";

export const StopSchema = z.object({
  id: z.string(),
  sequence: z.number(),
  name: z.string(),
  region: z.string(),
  lat: z.number(),
  lng: z.number(),
  expectedOffsetMin: z.number(),
  type: z.enum(["ORIGIN", "STOP", "DEST"]),
});
export type StopT = z.infer<typeof StopSchema>;

export const TIME_WINDOWS = {
  morning: { start: 5, end: 12, label: "Morning (5am–12pm)" },
  afternoon: { start: 12, end: 17, label: "Afternoon (12pm–5pm)" },
  evening: { start: 17, end: 21, label: "Evening (5pm–9pm)" },
  night: { start: 21, end: 29, label: "Night (9pm–5am)" },
} as const;

export type TimeWindowKey = keyof typeof TIME_WINDOWS;

export const TripSearchQuery = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  date: z.string().optional(), // YYYY-MM-DD
  maxPrice: z.coerce.number().int().positive().optional(),
  timeWindow: z.enum(["morning", "afternoon", "evening", "night"]).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  minSeats: z.coerce.number().int().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
export type TripSearchQueryT = z.infer<typeof TripSearchQuery>;

export const TripSummarySchema = z.object({
  id: z.string(),
  departureAt: z.string(),
  arrivalAt: z.string().nullable().optional(),
  status: z.string(),
  basePricePesewa: z.number(),
  seatsAvailable: z.number(),
  originName: z.string(),
  originRegion: z.string(),
  destName: z.string(),
  destRegion: z.string(),
  durationMin: z.number(),
  distanceKm: z.number(),
  busPlateNumber: z.string().nullable().optional(),
  operatorName: z.string(),
  operatorId: z.string(),
});
export type TripSummaryT = z.infer<typeof TripSummarySchema>;

export const TripDetailSchema = TripSummarySchema.extend({
  routeId: z.string(),
  stops: z.array(StopSchema),
  driverName: z.string().nullable().optional(),
  driverRating: z.number().nullable().optional(),
  busCapacity: z.number(),
});
export type TripDetailT = z.infer<typeof TripDetailSchema>;

export const SeatInfoSchema = z.object({
  id: z.string(),
  label: z.string(),
  row: z.number(),
  col: z.number(),
  status: z.enum(["AVAILABLE", "HELD", "BOOKED"]),
  pricePesewa: z.number(),
});
export type SeatInfoT = z.infer<typeof SeatInfoSchema>;

export const SeatHoldRequest = z.object({
  tripId: z.string(),
  seatLabel: z.string(),
  bookingIntentId: z.string().optional(),
});
export type SeatHoldRequestT = z.infer<typeof SeatHoldRequest>;

export const SeatHoldResponse = z.object({
  lockId: z.string(),
  seatLabel: z.string(),
  expiresAt: z.string(),
  pricePesewa: z.number(),
});
export type SeatHoldResponseT = z.infer<typeof SeatHoldResponse>;

export { RegionNameSchema };
