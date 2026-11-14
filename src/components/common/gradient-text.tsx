import { cn } from "@/lib/utils";

type GradientVariant = "primary" | "accent" | "hero";

export function GradientText({
  variant = "primary",
  as: Component = "span",
  className,
  children,
}: {
  variant?: GradientVariant;
  as?: React.ElementType;
  className?: string;
  children: React.ReactNode;
}) {
  const cls =
    variant === "accent"
      ? "text-grad-accent"
      : variant === "hero"
        ? "text-grad-hero"
        : "text-grad-primary";
  return (
    <Component className={cn(cls, className)}>{children}</Component>
  );
}
