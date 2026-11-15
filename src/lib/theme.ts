"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ColorTheme = "emerald" | "sunset" | "midnight";
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
      color: "emerald",
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
    id: "emerald",
    label: "Emerald",
    description: "Default — Ghana green",
    swatches: ["#047857", "#10b981", "#f59e0b"],
  },
  {
    id: "sunset",
    label: "Sunset",
    description: "Warm savanna sunsets",
    swatches: ["#ea580c", "#f59e0b", "#10b981"],
  },
  {
    id: "midnight",
    label: "Midnight",
    description: "Dark-first, cool teal",
    swatches: ["#14b8a6", "#0f766e", "#fbbf24"],
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

export const themeNoFlashScript = `(function(){try{var s=localStorage.getItem('aboard-theme');if(!s){document.documentElement.setAttribute('data-theme','emerald');return;}var p=JSON.parse(s);var c=(p&&p.state&&p.state.color)||'emerald';var m=(p&&p.state&&p.state.mode)||'light';document.documentElement.setAttribute('data-theme',c);if(m==='dark'){document.documentElement.classList.add('dark');}}catch(e){document.documentElement.setAttribute('data-theme','emerald');}})();`;
