"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/config/app";

type LogoVariant = "full" | "mark" | "white";

const SRC: Record<LogoVariant, string> = {
  full: "/brand/logo-full.svg",
  mark: "/brand/logo-mark.svg",
  white: "/brand/logo-white.svg",
};

const DIMENSIONS: Record<LogoVariant, { w: number; h: number }> = {
  full: { w: 120, h: 40 },
  mark: { w: 40, h: 40 },
  white: { w: 160, h: 44 },
};

export function Logo({
  variant = "full",
  height = 40,
  className,
  priority = false,
}: {
  variant?: LogoVariant;
  height?: number;
  className?: string;
  priority?: boolean;
}) {
  const base = DIMENSIONS[variant];
  const width = Math.round((base.w / base.h) * height);
  return (
    <Image
      src={SRC[variant]}
      width={width}
      height={height}
      alt={`${APP_NAME} logo`}
      className={cn("inline-block", className)}
      priority={priority}
    />
  );
}

export function LogoText({
  gradient = false,
  className,
}: {
  gradient?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-display font-bold tracking-tight",
        gradient ? "text-grad-primary" : "text-foreground",
        className,
      )}
    >
      {APP_NAME}
    </span>
  );
}

export function LogoLockup({
  variant = "full",
  height = 36,
  showText = true,
  gradientText = false,
  className,
}: {
  variant?: LogoVariant;
  height?: number;
  showText?: boolean;
  gradientText?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Logo variant={variant === "white" ? "mark" : "mark"} height={height} />
      {showText && <LogoText gradient={gradientText} />}
    </span>
  );
}
