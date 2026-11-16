"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Check, Moon, Palette, Sun } from "lucide-react";
import { useThemeStore, COLOR_THEMES, type ColorTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

/**
 * ThemeSwitcher — two color identities (Editorial + Mono) + light/dark toggle.
 *
 * Editorial: sand cream + charcoal + tan (warm, paper, magazine).
 * Mono: charcoal + white (high-contrast, stark, monochrome).
 */
export function ThemeSwitcher({ className }: { className?: string }) {
  const color = useThemeStore((s) => s.color);
  const mode = useThemeStore((s) => s.mode);
  const setColor = useThemeStore((s) => s.setColor);
  const toggleMode = useThemeStore((s) => s.toggleMode);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 rounded-full border-border/60"
          >
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">
              {color === "charcoal" ? "Mono" : "Editorial"}
            </span>
            <span className="sm:hidden sr-only">Theme</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Color identity</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {COLOR_THEMES.map((t) => (
            <DropdownMenuItem
              key={t.id}
              onClick={() => setColor(t.id as ColorTheme)}
              className="flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <span className="flex -space-x-1">
                  {t.swatches.map((c, i) => (
                    <span
                      key={i}
                      className="h-4 w-4 rounded-full ring-2 ring-background"
                      style={{ background: c }}
                    />
                  ))}
                </span>
                <div className="flex flex-col">
                  <span className="font-medium leading-tight">{t.label}</span>
                  <span className="text-[11px] text-muted-foreground leading-tight">
                    {t.description}
                  </span>
                </div>
              </div>
              {color === t.id && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        variant="outline"
        size="icon"
        onClick={toggleMode}
        className="rounded-full border-border/60"
        aria-label="Toggle dark mode"
        title={mode === "dark" ? "Switch to light" : "Switch to dark"}
      >
        {mode === "dark" ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
