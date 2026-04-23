import { Button } from "@/components/ui/button";
import type { PrioritizeResult } from "@/types";

export function PrioritizeSection({
  result,
  onJumpToTask,
}: {
  result: PrioritizeResult;
  onJumpToTask: (id: string) => void;
}) {
  const recs = result.recommendations ?? [];

  if (recs.length === 0) {
    return (
      <p className="text-xs text-[var(--muted)] mono">
        No recommendations returned.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {result.summary && (
        <p className="text-xs text-[var(--muted)] leading-relaxed">{result.summary}</p>
      )}
      <ol className="space-y-2">
        {recs.map((r, i) => (
          <li
            key={`${r.taskId}-${i}`}
            className="rounded-sm border p-3"
            style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
          >
            <div className="flex items-start gap-2">
              <span className="mono text-[10px] font-semibold text-amber-400 mt-0.5">
                {i + 1}.
              </span>
              <div className="flex-1">
                <div className="font-semibold text-sm text-[var(--foreground)]">
                  {r.title ?? "Untitled task"}
                </div>
                <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">
                  {r.reason}
                </p>
              </div>
              {r.taskId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onJumpToTask(r.taskId)}
                  className="shrink-0"
                >
                  Jump
                </Button>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
