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
import { CheckCircle2, Loader2, Lock } from "lucide-react";
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
      toast.success("Payment initiated — confirm in your wallet");
      onBooked?.(data.paymentId);
      setStep(2);
    },
    onError: (e: any) => {
      toast.error(e?.message ?? "Payment failed");
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
              className="flex flex-col items-center gap-4 py-4 text-center"
            >
              <Animation slot={AnimationSlot.BookingSuccess} />
              <div>
                <div className="flex items-center justify-center gap-2 font-display text-lg font-semibold">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Payment initiated
                </div>
                <p className="text-sm text-muted-foreground">
                  Confirm the prompt on your phone to receive your e-ticket.
                </p>
              </div>
              <Button onClick={onClose} variant="outline">
                Done
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </BottomSheet>
  );
}
