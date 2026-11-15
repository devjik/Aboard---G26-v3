"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { BottomSheet } from "@/components/common/bottom-sheet";
import { StepIndicator } from "@/components/common/step-indicator";
import { SeatMap, type SeatInfoT } from "./seat-map";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatGHS } from "@/lib/config/app";
import { apiClient } from "@/lib/api/client";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, Lock, ShieldCheck, QrCode, Calendar, Bus, MapPin, User } from "lucide-react";
import { Animation } from "@/components/animation";
import { AnimationSlot } from "@/lib/animations/registry";

export interface BookingSheetTrip {
  id: string;
  departureAt: string;
  arrivalAt: string | null;
  originName: string;
  destName: string;
  basePricePesewa: number;
  operatorName: string;
}

const STEPS = [
  { label: "Seat", description: "Pick a seat" },
  { label: "Your info", description: "Passenger details" },
  { label: "Pay", description: "Confirm & pay" },
];

export function BookingSheet({
  trip,
  open,
  onClose,
  onBooked,
  userId,
}: {
  trip: BookingSheetTrip | null;
  open: boolean;
  onClose: () => void;
  onBooked?: (paymentId: string) => void;
  userId?: string;
}) {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<SeatInfoT | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const seatsQ = useQuery({
    queryKey: ["trip", trip?.id, "seats"],
    queryFn: () => apiClient.trips.seats(trip!.id),
    enabled: !!trip && open,
  });

  useEffect(() => {
    if (open) {
      setStep(0);
      setSelected(null);
    }
  }, [open, trip?.id]);

  const holdMutation = useMutation({
    mutationFn: async (seat: SeatInfoT) => {
      return apiClient.trips.holdSeat({
        tripId: trip!.id,
        seatLabel: seat.label,
      });
    },
    onSuccess: () => {
      toast.success("Seat held for 5 minutes");
      setStep(1);
    },
    onError: (e: any) => {
      toast.error(e?.message ?? "Could not hold seat");
    },
  });

  const payMutation = useMutation({
    mutationFn: async () => {
      if (!selected || !trip) throw new Error("No seat selected");
      const bookingIntentId = `intent_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      const idempotencyKey = `idem_${bookingIntentId}`;
      return apiClient.payments.initiate({
        bookingIntentId,
        tripId: trip.id,
        seatLabel: selected.label,
        amountPesewa: selected.pricePesewa,
        payerRole: "STUDENT",
        idempotencyKey,
      });
    },
    onSuccess: (data) => {
      setPaymentId(data.paymentId);
      setStep(2);
    },
    onError: (e: any) => {
      toast.error(e?.message ?? "Payment failed");
    },
  });

  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [ticketData, setTicketData] = useState<any>(null);

  const confirmMutation = useMutation({
    mutationFn: () => apiClient.payments.confirm(paymentId!),
    onSuccess: (data) => {
      // Fetch the full ticket with QR
      apiClient.tickets.get(data.ticketId).then((ticket) => {
        setTicketData(ticket);
        toast.success("Ticket issued!", {
          description: `Ref: ${data.ref} · Seat ${data.seat} · Show QR at boarding`,
        });
      }).catch(() => {});
    },
    onError: (e: any) => {
      toast.error(e?.message ?? "Confirmation failed");
    },
  });

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={
        trip ? `Book ${trip.originName} → ${trip.destName}` : "Book a trip"
      }
      description={
        trip
          ? `${new Date(trip.departureAt).toLocaleString("en-GH", {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })} · ${trip.operatorName}`
          : undefined
      }
      className="sm:max-w-xl"
    >
      <div className="space-y-4">
        <StepIndicator steps={STEPS} current={step} />
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="seat"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
            >
              {seatsQ.isLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : seatsQ.data ? (
                <SeatMap
                  seats={(seatsQ.data.seats as SeatInfoT[]) ?? []}
                  basePricePesewa={seatsQ.data.basePricePesewa}
                  selectedLabel={selected?.label}
                  onSelect={(s) => setSelected(s)}
                />
              ) : (
                <div className="text-sm text-muted-foreground">
                  Could not load seats.
                </div>
              )}
              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 p-3">
                <div className="text-sm">
                  <div className="text-muted-foreground">Selected</div>
                  <div className="font-semibold">
                    {selected ? `Seat ${selected.label}` : "—"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-muted-foreground">Fare</div>
                  <div className="font-semibold text-grad-primary">
                    {selected ? formatGHS(selected.pricePesewa) : "—"}
                  </div>
                </div>
                <Button
                  disabled={!selected || holdMutation.isPending}
                  onClick={() => selected && holdMutation.mutate(selected)}
                >
                  <Lock className="mr-1 h-3.5 w-3.5" />
                  Hold seat
                </Button>
              </div>
            </motion.div>
          )}
          {step === 1 && (
            <motion.div
              key="info"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              className="space-y-3"
            >
              <div className="grid gap-3">
                <div>
                  <Label htmlFor="bk-name">Passenger name</Label>
                  <Input
                    id="bk-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ama Mensah"
                  />
                </div>
                <div>
                  <Label htmlFor="bk-phone">Phone</Label>
                  <Input
                    id="bk-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0240000001"
                  />
                </div>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Seat</span>
                  <span className="font-medium">{selected?.label ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fare</span>
                  <span className="font-semibold text-grad-primary">
                    {selected ? formatGHS(selected.pricePesewa) : "—"}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(0)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={() => payMutation.mutate()}
                  disabled={payMutation.isPending || !selected}
                  className="flex-1 bg-grad-primary text-primary-foreground"
                >
                  {payMutation.isPending ? (
                    <>
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      Initiating…
                    </>
                  ) : (
                    `Pay ${selected ? formatGHS(selected.pricePesewa) : ""}`
                  )}
                </Button>
              </div>
            </motion.div>
          )}
          {step === 2 && (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {!ticketData ? (
                <div className="flex flex-col items-center gap-4 py-4 text-center">
                  <Animation slot={AnimationSlot.PaymentProcessing} />
                  <div>
                    <div className="flex items-center justify-center gap-2 font-display text-lg font-semibold">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      Payment initiated
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Confirm the prompt on your phone to receive your e-ticket with QR code.
                    </p>
                  </div>
                  <Button
                    onClick={() => confirmMutation.mutate()}
                    disabled={confirmMutation.isPending}
                    className="gap-1.5 bg-grad-primary text-primary-foreground"
                  >
                    {confirmMutation.isPending ? (
                      <>
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        Confirming payment…
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" />
                        Confirm payment
                      </>
                    )}
                  </Button>
                  <p className="text-[11px] text-muted-foreground">
                    Sandbox mode — tapping this simulates the mobile money confirmation.
                  </p>
                </div>
              ) : (
                <TicketDisplay data={ticketData} onClose={onClose} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </BottomSheet>
  );
}

/* ---------------- Ticket display with QR code ---------------- */
function TicketDisplay({ data, onClose }: { data: any; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 20 }}
      className="space-y-4"
    >
      {/* success animation */}
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-grad-success text-white shadow-glow">
          <CheckCircle2 className="size-8" />
        </div>
        <h3 className="font-display text-lg font-bold">Ticket issued!</h3>
        <p className="text-xs text-muted-foreground">Show this QR code at boarding</p>
      </div>

      {/* ticket card */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-belt p-5 text-white shadow-card">
        <div className="absolute inset-0 bg-grad-primary opacity-10" />
        <div className="relative space-y-4">
          {/* header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bus className="size-4 text-primary" />
              <span className="font-display text-sm font-bold">BOARDING PASS</span>
            </div>
            <span className="rounded-full bg-success/20 px-2 py-0.5 text-[10px] font-bold text-success">
              {data.status}
            </span>
          </div>

          {/* route */}
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-primary shrink-0" />
            <span className="font-display text-base font-bold">{data.route}</span>
          </div>

          {/* QR code */}
          <div className="flex justify-center rounded-xl bg-white p-3">
            <img src={data.qr} alt="Ticket QR code" width={180} height={180} />
          </div>

          {/* ticket details */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-white/50">Reference</div>
              <div className="font-mono font-bold">{data.ref}</div>
            </div>
            <div>
              <div className="text-white/50">Seat</div>
              <div className="font-bold">{data.seatLabel}</div>
            </div>
            <div>
              <div className="text-white/50">Passenger</div>
              <div className="font-medium truncate">{data.studentName}</div>
            </div>
            <div>
              <div className="text-white/50">Departure</div>
              <div className="font-medium">{data.departureFormatted}</div>
            </div>
          </div>

          {/* divider */}
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-white/10" />
            <QrCode className="size-3 text-white/30" />
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* footer */}
          <div className="flex items-center justify-between text-[10px] text-white/50">
            <span>{data.operatorName}</span>
            <span>Version {data.version}</span>
          </div>
        </div>
      </div>

      {/* notification alert */}
      <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 p-3">
        <ShieldCheck className="size-4 shrink-0 text-success" />
        <p className="text-xs text-foreground">
          A notification has been sent to your notifications bell with the ticket reference.
        </p>
      </div>

      <Button onClick={onClose} className="w-full bg-grad-primary text-primary-foreground">
        Done
      </Button>
    </motion.div>
  );
}
