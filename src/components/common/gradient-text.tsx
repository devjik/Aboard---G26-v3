import { cn } from "@/lib/utils";

type GradientVariant = "primary" | "tan" | "ink" | "accent" | "hero";

/**
 * GradientText — editorial gradient text helper.
 *
 * In the sand/charcoal/tan system, "primary" = tan gradient (warm accent),
 * "ink" = charcoal gradient, "accent" = charcoal→tan blend.
 * Used sparingly — editorial design prefers solid ink color with one
 * tan-accented word, not full gradient paragraphs.
 */
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
        : variant === "ink"
          ? "text-grad-ink"
          : variant === "tan"
            ? "text-grad-tan"
            : "text-grad-primary";
  return (
    <Component className={cn(cls, className)}>{children}</Component>
  );
}
