"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Bus, CircleDollarSign } from "lucide-react";
import { formatGHS } from "@/lib/config/app";
import { cn } from "@/lib/utils";

export interface SeatInfoT {
  id: string;
  label: string;
  row: number;
  col: number;
  status: "AVAILABLE" | "HELD" | "BOOKED";
  pricePesewa: number;
}

export function SeatMap({
  seats,
  rows = 8,
  cols = 4,
  basePricePesewa,
  selectedLabel,
  onSelect,
  className,
}: {
  seats: SeatInfoT[];
  rows?: number;
  cols?: number;
  basePricePesewa: number;
  selectedLabel?: string | null;
  onSelect?: (seat: SeatInfoT) => void;
  className?: string;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  const byLabel = new Map(seats.map((s) => [s.label, s]));
  const grid: (SeatInfoT | null)[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: (SeatInfoT | null)[] = [];
    for (let c = 0; c < cols; c++) {
      const label = `${r + 1}${String.fromCharCode(65 + c)}`;
      row.push(byLabel.get(label) ?? null);
    }
    grid.push(row);
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        <Legend color="bg-card border-border" label="Available" />
        <Legend color="bg-amber-400 border-amber-500" label="Held" />
        <Legend color="bg-muted border-muted-foreground/40" label="Booked" />
        <Legend color="bg-primary border-primary text-primary-foreground" label="Selected" />
        <span className="ml-auto flex items-center gap-1">
          <CircleDollarSign className="h-3.5 w-3.5 text-primary" />
          Front row +{formatGHS(500)}
        </span>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between rounded-md bg-grad-belt px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">
          <span className="flex items-center gap-1">
            <Bus className="h-3 w-3" /> Driver
          </span>
          <span>Door →</span>
        </div>
        <div className="space-y-2">
          {grid.map((row, ri) => (
            <div
              key={ri}
              className="grid items-center gap-1.5"
              style={{
                gridTemplateColumns: `repeat(${cols}, 1fr) 0.5fr repeat(${cols}, 1fr)`,
              }}
            >
              {row.slice(0, Math.ceil(cols / 2)).map((s, ci) => (
                <SeatCell
                  key={`L-${ci}`}
                  seat={s}
                  isFront={ri < 2}
                  selected={selectedLabel === s?.label}
                  hovered={hovered === s?.label}
                  onHover={(v) => s && setHovered(v ? s.label : null)}
                  onSelect={onSelect}
                />
              ))}
              <span className="text-center text-[9px] text-muted-foreground">
                {ri + 1}
              </span>
              {row.slice(Math.ceil(cols / 2)).map((s, ci) => (
                <SeatCell
                  key={`R-${ci}`}
                  seat={s}
                  isFront={ri < 2}
                  selected={selectedLabel === s?.label}
                  hovered={hovered === s?.label}
                  onHover={(v) => s && setHovered(v ? s.label : null)}
                  onSelect={onSelect}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      {hovered && byLabel.get(hovered) && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg bg-foreground px-3 py-1.5 text-xs text-background shadow-card"
        >
          Seat <strong>{hovered}</strong> ·{" "}
          {formatGHS(byLabel.get(hovered)!.pricePesewa)}
        </motion.div>
      )}
      <div className="text-center text-[11px] text-muted-foreground">
        Base fare {formatGHS(basePricePesewa)}. Front two rows +{formatGHS(500)}.
      </div>
    </div>
  );
}

function SeatCell({
  seat,
  isFront,
  selected,
  hovered,
  onHover,
  onSelect,
}: {
  seat: SeatInfoT | null;
  isFront: boolean;
  selected: boolean;
  hovered: boolean;
  onHover: (v: boolean) => void;
  onSelect?: (seat: SeatInfoT) => void;
}) {
  if (!seat) return <div className="aspect-square" />;
  const isBooked = seat.status === "BOOKED";
  const isHeld = seat.status === "HELD";
  const disabled = isBooked || isHeld;
  return (
    <motion.button
      type="button"
      whileTap={disabled ? undefined : { scale: 0.92 }}
      whileHover={disabled ? undefined : { y: -2 }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onClick={() => !disabled && onSelect?.(seat)}
      disabled={disabled}
      className={cn(
        "relative flex aspect-square items-center justify-center rounded-md border text-[10px] font-semibold transition-colors",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : isBooked
            ? "border-border bg-muted text-muted-foreground/40"
            : isHeld
              ? "border-amber-500/40 bg-amber-400/80 text-amber-950"
              : isFront
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-card text-foreground hover:border-primary/40",
        hovered && !disabled && "ring-2 ring-primary/30",
      )}
    >
      {seat.label}
    </motion.button>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("h-3 w-3 rounded border", color)} />
      {label}
    </span>
  );
}
