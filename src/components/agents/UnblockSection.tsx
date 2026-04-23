import { Badge } from "@/components/ui/badge";
import type { UnblockResult } from "@/types";

export function UnblockSection({ result }: { result: UnblockResult }) {
  const blocked = result.blockedTasks ?? [];
  if (blocked.length === 0) {
    return (
      <p className="text-xs text-[var(--muted)] mono">
        No blocked tasks found. Nice.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {blocked.map((b) => {
        const severity =
          b.daysStuck >= 7 ? "red" : b.daysStuck >= 3 ? "yellow" : "zinc";
        const badgeClass =
          severity === "red"
            ? "border-red-700 text-red-400"
            : severity === "yellow"
            ? "border-amber-700 text-amber-400"
            : "border-zinc-600 text-zinc-400";
        return (
          <li
            key={b.task.id}
            className="rounded-sm border p-3 space-y-3"
            style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="font-semibold text-sm text-[var(--foreground)]">
                {b.task.title}
              </div>
              <Badge variant="outline" className={badgeClass}>
                {b.daysStuck}d stuck
              </Badge>
            </div>

            {b.questions.length > 0 && (
              <div>
                <div className="mono text-[10px] font-semibold tracking-widest uppercase text-[var(--muted)] mb-1">
                  Questions
                </div>
                <ul className="list-disc ml-5 space-y-1 text-xs text-[var(--foreground)]">
                  {b.questions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </div>
            )}

            {b.nextActions.length > 0 && (
              <div>
                <div className="mono text-[10px] font-semibold tracking-widest uppercase text-emerald-400 mb-1">
                  Next actions
                </div>
                <ul className="list-disc ml-5 space-y-1 text-xs text-[var(--foreground)]">
                  {b.nextActions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
