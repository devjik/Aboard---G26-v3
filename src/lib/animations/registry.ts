export enum AnimationSlot {
  Loading = "loading",
  BookingSuccess = "booking-success",
  BusArriving = "bus-arriving",
  PaymentPending = "payment-pending",
  SeatLocked = "seat-locked",
  TicketIssued = "ticket-issued",
  TripCancelled = "trip-cancelled",
  DriverEnroute = "driver-enroute",
  EmptyInbox = "empty-inbox",
  RouteNotFound = "route-not-found",
  NetworkError = "network-error",
  AccountVerified = "account-verified",
  BusDeparting = "bus-departing",
  Welcome = "welcome",
  Tracking = "tracking",
}

export interface AnimationRegistryEntry {
  slot: AnimationSlot;
  path: string;
  enabled: boolean;
  width?: number;
  height?: number;
}

const SLOTS: AnimationSlot[] = [
  AnimationSlot.Loading,
  AnimationSlot.BookingSuccess,
  AnimationSlot.BusArriving,
  AnimationSlot.PaymentPending,
  AnimationSlot.SeatLocked,
  AnimationSlot.TicketIssued,
  AnimationSlot.TripCancelled,
  AnimationSlot.DriverEnroute,
  AnimationSlot.EmptyInbox,
  AnimationSlot.RouteNotFound,
  AnimationSlot.NetworkError,
  AnimationSlot.AccountVerified,
  AnimationSlot.BusDeparting,
  AnimationSlot.Welcome,
  AnimationSlot.Tracking,
];

export const ANIMATION_REGISTRY: AnimationRegistryEntry[] = SLOTS.map((slot) => ({
  slot,
  path: `/animations/${slot}.json`,
  enabled: false,
  width: 320,
  height: 240,
}));

export function getAnimation(
  slot: AnimationSlot,
): AnimationRegistryEntry | undefined {
  return ANIMATION_REGISTRY.find((e) => e.slot === slot);
}
