"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bus, MousePointerClick, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: string;
  title: string;
  blurb: string;
  icon: React.ReactNode;
  render: () => React.ReactNode;
}

function RoutePreview() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Route</span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
          SCHEDULED
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center">
          <span className="h-2 w-2 rounded-full bg-primary" />
          <span className="my-1 h-8 w-0.5 bg-border" />
          <span className="h-2 w-2 rounded-full bg-red-500" />
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <div className="text-sm font-semibold">Cape Coast</div>
            <div className="text-[11px] text-muted-foreground">Central · 06:00</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold">Accra</div>
            <div className="text-[11px] text-muted-foreground">Greater Accra · 08:45</div>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs">
        <span className="text-muted-foreground">2h 45m · 145 km</span>
        <span className="font-semibold text-grad-primary">GH₵45.00</span>
      </div>
    </div>
  );
}

function SeatPreview() {
  const seats = Array.from({ length: 16 });
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Choose your seat
        </span>
        <span className="text-[10px] text-muted-foreground">Front row +GH₵5</span>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        <div className="col-span-5 mb-1 flex items-center justify-between rounded-md bg-muted px-2 py-1 text-[9px] text-muted-foreground">
          <span>← Driver</span>
          <span>Door →</span>
        </div>
        {seats.map((_, i) => {
          const taken = [3, 7, 11, 15].includes(i);
          const front = i < 4;
          return (
            <div
              key={i}
              className={cn(
                "aspect-square rounded-md border text-[9px] font-semibold",
                taken
                  ? "border-border bg-muted text-muted-foreground/50"
                  : front
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-card text-foreground",
              )}
            >
              <div className="flex h-full items-center justify-center">
                {Math.floor(i / 4) + 1}
                {String.fromCharCode(65 + (i % 4))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TicketPreview() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="bg-grad-primary px-4 py-3 text-primary-foreground">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider opacity-80">
              E-Ticket
            </div>
            <div className="text-base font-semibold">Aboard · AB-2024-0042</div>
          </div>
          <Bus className="h-5 w-5" />
        </div>
      </div>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between text-xs">
          <div>
            <div className="text-muted-foreground">Passenger</div>
            <div className="font-semibold">Ama Mensah</div>
          </div>
          <div className="text-right">
            <div className="text-muted-foreground">Seat</div>
            <div className="font-semibold">3B</div>
          </div>
        </div>
        <div className="my-3 border-t border-dashed border-border" />
        <div className="flex items-center justify-between text-xs">
          <div>
            <div className="text-muted-foreground">From</div>
            <div className="font-semibold">Cape Coast</div>
          </div>
          <div className="text-right">
            <div className="text-muted-foreground">To</div>
            <div className="font-semibold">Accra</div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-md bg-muted px-3 py-2">
          <div className="flex h-8 w-8 items-end gap-[1px] overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className="w-1 bg-foreground"
                style={{ height: `${20 + ((i * 17) % 80)}%` }}
              />
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground">
            Show this at boarding
          </span>
        </div>
      </div>
    </div>
  );
}

const STEPS: Step[] = [
  {
    id: "search",
    title: "Find a trip",
    blurb: "Search inter-city routes and compare departures, prices, and operators.",
    icon: <MousePointerClick className="h-4 w-4" />,
    render: RoutePreview,
  },
  {
    id: "seat",
    title: "Pick your seat",
    blurb: "Live seat map with held / booked states. Reserve up to 5 minutes.",
    icon: <Bus className="h-4 w-4" />,
    render: SeatPreview,
  },
  {
    id: "ticket",
    title: "Ride & arrive",
    blurb: "Get your e-ticket instantly. Track your bus live. Arrive safe.",
    icon: <Ticket className="h-4 w-4" />,
    render: TicketPreview,
  },
];

export function InteractiveJourneySteps() {
  const [active, setActive] = useState(0);
  const ActivePreview = STEPS[active].render;
  return (
    <div className="grid gap-6 md:grid-cols-2 md:gap-10">
      <ol className="space-y-2">
        {STEPS.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "group flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-colors",
                i === active
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/40",
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  i === active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground group-hover:text-primary",
                )}
              >
                {s.icon}
              </span>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Step {i + 1}
                  </span>
                  {i === active && (
                    <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                      ACTIVE
                    </span>
                  )}
                </div>
                <h3 className="font-display text-base font-semibold">
                  {s.title}
                </h3>
                <p className="text-sm text-muted-foreground">{s.blurb}</p>
              </div>
            </button>
          </li>
        ))}
      </ol>
      <div className="relative flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={STEPS[active].id}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="w-full max-w-sm"
          >
            <ActivePreview />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
