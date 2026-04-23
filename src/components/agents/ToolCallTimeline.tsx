import type { ToolCallLog } from "@/types";
import { labelFor } from "./toolLabels";

export function ToolCallTimeline({ log }: { log: ToolCallLog[] }) {
  return (
    <ol className="border-t divide-y" style={{ borderColor: "var(--border)" }}>
      {log.map((entry, i) => (
        <li key={i} className="p-3 border-b last:border-b-0" style={{ borderColor: "var(--border)" }}>
          <div className="text-xs mono text-amber-400 mb-1">
            → {labelFor(entry.tool, entry.input).label}
          </div>
          <details className="text-[10px] mono text-[var(--muted)]">
            <summary className="cursor-pointer select-none">raw</summary>
            <pre
              className="mt-2 p-2 rounded-sm whitespace-pre-wrap break-all max-h-40 overflow-auto"
              style={{ background: "var(--surface-2)" }}
            >
{`in:  ${JSON.stringify(entry.input, null, 2)}
out: ${entry.output}`}
            </pre>
          </details>
        </li>
      ))}
    </ol>
  );
}
