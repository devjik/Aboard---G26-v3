"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Aboard theme system — Sand Cream + Charcoal + Tan Editorial.
 *
 * One color identity (warm paper + tan accent), two modes (light/dark).
 * The light mode is the signature; dark mode is the polished alternative.
 */
export type ColorTheme = "editorial"; // single identity; kept as type for future expansion
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

export const themeNoFlashScript = `(function(){try{var s=localStorage.getItem('aboard-theme');if(!s){document.documentElement.setAttribute('data-theme','editorial');return;}var p=JSON.parse(s);var c=(p&&p.state&&p.state.color)||'editorial';var m=(p&&p.state&&p.state.mode)||'light';document.documentElement.setAttribute('data-theme',c);if(m==='dark'){document.documentElement.classList.add('dark');}}catch(e){document.documentElement.setAttribute('data-theme','editorial');}})();`;
