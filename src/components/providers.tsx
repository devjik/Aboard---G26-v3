"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { Toaster as SonnerToaster } from "sonner";
import { Toaster } from "@/components/ui/toaster";
import { applyTheme, useThemeStore } from "@/lib/theme";

function ThemeSync() {
  const color = useThemeStore((s) => s.color);
  const mode = useThemeStore((s) => s.mode);
  useEffect(() => {
    applyTheme(color, mode);
  }, [color, mode]);
  return null;
}

let qc: QueryClient | null = null;
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        retry: (failureCount, error: any) => {
          if (error?.status && error.status >= 400 && error.status < 500) {
            return false;
          }
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
      },
    },
  });
}

function getQueryClient() {
  if (!qc) qc = makeQueryClient();
  return qc;
}

export function Providers({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeSync />
      {children}
      <Toaster />
      <SonnerToaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  );
}

export { useThemeStore };
export type { ColorTheme, Mode } from "@/lib/theme";
