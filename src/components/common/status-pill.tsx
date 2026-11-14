import { cn } from "@/lib/utils";

type Tone =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "neutral"
  | "accent";

interface ToneClasses {
  bg: string;
  text: string;
  border: string;
  dot: string;
}

const TONES: Record<Tone, ToneClasses> = {
  primary: {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/20",
    dot: "bg-primary",
  },
  success: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  warning: {
    bg: "bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-500/20",
    dot: "bg-amber-500",
  },
  danger: {
    bg: "bg-red-500/10",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-500/20",
    dot: "bg-red-500",
  },
  neutral: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    border: "border-border",
    dot: "bg-muted-foreground",
  },
  accent: {
    bg: "bg-accent/15",
    text: "text-accent-foreground",
    border: "border-accent/30",
    dot: "bg-accent",
  },
};

export function StatusPill({
  tone = "neutral",
  dot = false,
  pulse = false,
  children,
  className,
}: {
  tone?: Tone;
  dot?: boolean;
  pulse?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const t = TONES[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide",
        t.bg,
        t.text,
        t.border,
        className,
      )}
    >
      {dot && (
        <span className="relative inline-flex h-1.5 w-1.5">
          {pulse && (
            <span
              className={cn(
                "absolute inset-0 rounded-full opacity-75",
                t.dot,
              )}
              style={{ animation: "aboard-pulse-ring 1.6s ease-out infinite" }}
            />
          )}
          <span className={cn("relative h-1.5 w-1.5 rounded-full", t.dot)} />
        </span>
      )}
      {children}
    </span>
  );
}
