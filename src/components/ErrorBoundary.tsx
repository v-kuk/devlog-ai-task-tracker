"use client";

import { Component, type ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackLabel?: string;
  onReset?: () => void;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error("[ErrorBoundary]", error, info);
  }

  reset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        className="rounded-sm border p-4 flex items-start gap-3"
        style={{
          background: "rgba(239, 68, 68, 0.08)",
          borderColor: "rgba(239, 68, 68, 0.3)",
          color: "rgb(252, 165, 165)",
        }}
      >
        <AlertCircle size={16} className="shrink-0 mt-0.5" />
        <div className="flex-1 text-xs">
          <div className="font-semibold">
            {this.props.fallbackLabel ?? "Something went wrong"}
          </div>
          <div className="mono mt-1 opacity-80 break-words">
            {this.state.error.message}
          </div>
        </div>
        <button
          onClick={this.reset}
          className="flex items-center gap-1 text-xs mono px-2 py-1 rounded-sm border transition-colors hover:bg-red-900/20"
          style={{ borderColor: "rgba(239, 68, 68, 0.3)" }}
        >
          <RefreshCw size={11} />
          Reset
        </button>
      </div>
    );
  }
}
