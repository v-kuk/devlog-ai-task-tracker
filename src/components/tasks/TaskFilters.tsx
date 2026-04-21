"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { X, SlidersHorizontal } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "todo", label: "Todo" },
  { value: "in-progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

const SORT_OPTIONS = [
  { value: "priority", label: "Priority" },
  { value: "createdAt", label: "Date created" },
];

interface FilterSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}

function FilterSelect({ value, onChange, options }: FilterSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="mono text-xs h-8 px-3 rounded-sm border appearance-none cursor-pointer transition-colors focus:outline-none focus:border-[var(--primary)]"
      style={{
        background: "var(--surface-2)",
        borderColor: "var(--border)",
        color: value ? "var(--foreground)" : "var(--muted)",
        minWidth: "120px",
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} style={{ background: "var(--surface-2)" }}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export function TaskFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const status = searchParams.get("status") ?? "";
  const sortBy = searchParams.get("sortBy") ?? "priority";

  const hasActiveFilters = status !== "" || sortBy !== "priority";

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "" || (key === "sortBy" && value === "priority")) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      router.push(`/?${params.toString()}`);
    },
    [router, searchParams]
  );

  const clearFilters = useCallback(() => {
    router.push("/");
  }, [router]);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <SlidersHorizontal size={14} className="text-[var(--muted)]" />

      <FilterSelect
        value={status}
        onChange={(v) => update("status", v)}
        options={STATUS_OPTIONS}
      />

      <FilterSelect
        value={sortBy}
        onChange={(v) => update("sortBy", v)}
        options={SORT_OPTIONS}
      />

      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="flex items-center gap-1.5 mono text-xs h-8 px-3 rounded-sm border transition-colors hover:border-[var(--border-hover)] hover:text-[var(--foreground)]"
          style={{ borderColor: "var(--border)", color: "var(--muted)", background: "transparent" }}
        >
          <X size={11} />
          Clear
        </button>
      )}
    </div>
  );
}
