"use client";

import { useState } from "react";
import { Check, ClipboardCopy } from "lucide-react";
import type { StatusResult } from "@/types";

const TONE_STYLES: Record<string, { label: string; className: string }> = {
  "kick-off":        { label: "Kick-off",        className: "border-blue-700 text-blue-400" },
  "progress-update": { label: "Progress update",  className: "border-amber-700 text-amber-400" },
  "celebratory":     { label: "Celebratory",      className: "border-emerald-700 text-emerald-400" },
  "needs-help":      { label: "Needs help",        className: "border-red-700 text-red-400" },
  "winding-down":    { label: "Winding down",      className: "border-violet-700 text-violet-400" },
};

export function StatusSection({ result }: { result: StatusResult }) {
  const [copied, setCopied] = useState(false);

  if (!result.message) {
    return (
      <p className="text-xs text-[var(--muted)] mono">No update generated.</p>
    );
  }

  const tone = TONE_STYLES[result.tone] ?? { label: result.tone, className: "border-zinc-600 text-zinc-400" };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.message);
    } catch {
      // clipboard unavailable
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-3">
      <div
        className="rounded-sm border p-4 space-y-3"
        style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className={`mono text-[10px] font-semibold tracking-widest uppercase px-2 py-0.5 rounded-sm border ${tone.className}`}
          >
            {tone.label}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 mono text-[10px] px-2 py-1 rounded-sm border transition-colors hover:border-amber-500 hover:text-amber-400"
            style={{ borderColor: "var(--border)", color: "var(--muted)" }}
            title="Copy to clipboard"
          >
            {copied ? <Check size={11} /> : <ClipboardCopy size={11} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <p className="text-sm text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
          {result.message}
        </p>
      </div>
    </div>
  );
}
