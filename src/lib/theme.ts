"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Aboard theme system.
 *
 * Two color identities, each with light + dark modes:
 *   - "editorial": sand cream + charcoal + tan (warm, paper, magazine)
 *   - "charcoal":  charcoal + white (monochrome, high-contrast, stark)
 *
 * The light mode is the signature for each; dark mode is the polished alternative.
 */
export type ColorTheme = "editorial" | "charcoal";
export type Mode = "light" | "dark";

export interface ThemeState {
  color: ColorTheme;
  mode: Mode;
  setColor: (color: ColorTheme) => void;
  setMode: (mode: Mode) => void;
  toggleMode: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      color: "editorial",
      mode: "light",
      setColor: (color) => set({ color }),
      setMode: (mode) => set({ mode }),
      toggleMode: () =>
        set((s) => ({ mode: s.mode === "light" ? "dark" : "light" })),
    }),
    {
      name: "aboard-theme",
      skipHydration: false,
    },
  ),
);

export const COLOR_THEMES: Array<{
  id: ColorTheme;
  label: string;
  description: string;
  swatches: string[];
}> = [
  {
    id: "editorial",
    label: "Editorial",
    description: "Sand cream + charcoal + tan",
    swatches: ["#FBF6EC", "#1E1A14", "#B8895A"],
  },
  {
    id: "charcoal",
    label: "Mono",
    description: "Charcoal + white (high contrast)",
    swatches: ["#FFFFFF", "#0F0F0F", "#666666"],
  },
];

export function applyTheme(color: ColorTheme, mode: Mode): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", color);
  if (mode === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export const themeNoFlashScript = `(function(){try{var s=localStorage.getItem('aboard-theme');var c='editorial';var m='light';if(s){var p=JSON.parse(s);if(p&&p.state){c=(p.state.color==='charcoal')?'charcoal':'editorial';m=(p.state.mode==='dark')?'dark':'light';}}document.documentElement.setAttribute('data-theme',c);if(m==='dark'){document.documentElement.classList.add('dark');}}catch(e){document.documentElement.setAttribute('data-theme','editorial');}})();`;
