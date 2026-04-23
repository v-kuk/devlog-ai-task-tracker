import { Loader2, MessageCircleQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import type { DecomposeResult } from "@/types";

interface DecomposeSectionProps {
  clarificationAnswer: string;
  setClarificationAnswer: (v: string) => void;
  onSubmitClarification: () => void;
  result: DecomposeResult;
  loading: boolean;
}

function priorityBadgeClass(p: "low" | "medium" | "high"): string {
  if (p === "high") return "border-red-700 text-red-400";
  if (p === "medium") return "border-amber-700 text-amber-400";
  return "border-emerald-700 text-emerald-400";
}

export function DecomposeSection({
  clarificationAnswer,
  setClarificationAnswer,
  onSubmitClarification,
  result,
  loading,
}: DecomposeSectionProps) {
  if (result.needsClarification) {
    const question = result.question;
    return (
      <div
        className="rounded-sm border p-4 space-y-3"
        style={{
          background: "rgba(251, 191, 36, 0.08)",
          borderColor: "rgba(251, 191, 36, 0.3)",
        }}
      >
        <div className="flex items-start gap-2">
          <MessageCircleQuestion size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="mono text-[10px] font-semibold tracking-widest uppercase text-amber-400">
              Clarification needed
            </div>
            <p className="text-sm text-[var(--foreground)] mt-1">{question}</p>
          </div>
        </div>
        <Textarea
          value={clarificationAnswer}
          onChange={(e) => setClarificationAnswer(e.target.value)}
          placeholder="Type your answer…"
          disabled={loading}
        />
        <Button
          onClick={onSubmitClarification}
          disabled={loading || !clarificationAnswer.trim()}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin mr-2" /> Submitting…
            </>
          ) : (
            "Submit answer"
          )}
        </Button>
      </div>
    );
  }

  const subtasks = result.subtasks ?? [];

  return (
    <div className="space-y-3">
      {result.summary && (
        <p className="text-xs text-[var(--muted)] leading-relaxed">{result.summary}</p>
      )}
      {subtasks.length === 0 ? (
        <p className="text-xs text-[var(--muted)] mono">No subtasks created.</p>
      ) : (
        <ul className="space-y-2">
          {subtasks.map((s, i) => (
            <li
              key={s.id ?? i}
              className="flex items-start gap-2 rounded-sm border p-3"
              style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
            >
              <input
                type="checkbox"
                disabled
                className="mt-0.5 accent-amber-400"
                aria-label="subtask complete"
              />
              <div className="flex-1">
                <div className="text-sm text-[var(--foreground)] font-medium">
                  {s.title}
                </div>
              </div>
              <Badge variant="outline" className={priorityBadgeClass(s.priority)}>
                {s.priority}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
