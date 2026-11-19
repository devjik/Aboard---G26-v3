"use client";

import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * MapErrorBoundary — catches runtime errors from the maplibre/mapcn
 * components (WebGL context loss, worker load failure, style load error,
 * etc.) and shows a graceful fallback instead of crashing the whole page.
 */
export class MapErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[MapErrorBoundary] Map crashed:", error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex h-[420px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <MapPin className="h-6 w-6" />
          </span>
          <div>
            <h3 className="font-display text-lg font-medium">
              Map couldn&rsquo;t load
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              The map encountered an error. This is usually a temporary issue —
              your browser may not support WebGL, or the map tiles are
              unreachable. Try refreshing.
            </p>
          </div>
          <Button
            onClick={() => this.setState({ hasError: false })}
            variant="outline"
            className="rounded-full"
          >
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
