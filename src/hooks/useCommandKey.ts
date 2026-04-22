"use client";

import { useEffect } from "react";

/**
 * Fires callback when the user presses Cmd/Ctrl + key (lowercase).
 * Ignores events originating from inputs/textareas/contentEditable.
 */
export function useCommandKey(key: string, callback: () => void) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const isEditable =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        (target?.isContentEditable ?? false);

      if (isEditable) return;
      if (e.key.toLowerCase() !== key.toLowerCase()) return;
      if (!(e.metaKey || e.ctrlKey)) return;

      e.preventDefault();
      callback();
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [key, callback]);
}
