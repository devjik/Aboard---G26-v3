"use client";

import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "@/lib/theme";
import { cn } from "@/lib/utils";

/**
 * ThemeSwitcher — editorial version.
 *
 * Single identity (sand cream + charcoal + tan), so the switcher
 * is just a light/dark toggle. Removed the 3-color dropdown.
 */
export function ThemeSwitcher({ className }: { className?: string }) {
  const mode = useThemeStore((s) => s.mode);
  const toggleMode = useThemeStore((s) => s.toggleMode);

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleMode}
      className={cn("rounded-full border-border/60", className)}
      aria-label="Toggle dark mode"
      title={mode === "dark" ? "Switch to light" : "Switch to dark"}
    >
      {mode === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}
