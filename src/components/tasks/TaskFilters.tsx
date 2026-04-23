"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { X, SlidersHorizontal, ArrowUp, ArrowDown, List, LayoutGrid } from "lucide-react";

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

const TASK_TYPE_OPTIONS = [
  { value: "", label: "All tasks" },
  { value: "parents", label: "Parents only" },
  { value: "subtasks", label: "Subtasks only" },
];

interface FilterSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
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

  const view = searchParams.get("view") ?? "list";
  const status = searchParams.get("status") ?? "";
  const sortBy = searchParams.get("sortBy") ?? "priority";
  const sortOrderParam = searchParams.get("sortOrder");
  const taskType = searchParams.get("taskType") ?? "";
  const parentId = searchParams.get("parentId") ?? "";
  const parentTitle = searchParams.get("parentTitle") ?? "";

  const naturalDefault = sortBy === "createdAt" ? "desc" : "asc";
  const effectiveOrder = (sortOrderParam === "asc" || sortOrderParam === "desc")
    ? sortOrderParam
    : naturalDefault;

  const hasActiveFilters =
    status !== "" ||
    sortBy !== "priority" ||
    sortOrderParam !== null ||
    taskType !== "" ||
    parentId !== "";

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "" || (key === "sortBy" && value === "priority")) {
        params.delete(key);
        if (key === "sortBy") params.delete("sortOrder");
      } else {
        params.set(key, value);
      }
      router.push(`/?${params.toString()}`);
    },
    [router, searchParams]
  );

  const toggleOrder = useCallback(() => {
    const next = effectiveOrder === "asc" ? "desc" : "asc";
    const nextNatural = sortBy === "createdAt" ? "desc" : "asc";
    const params = new URLSearchParams(searchParams.toString());
    if (next === nextNatural) {
      params.delete("sortOrder");
    } else {
      params.set("sortOrder", next);
    }
    router.push(`/?${params.toString()}`);
  }, [effectiveOrder, sortBy, router, searchParams]);

  const clearParentFilter = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("parentId");
    params.delete("parentTitle");
    router.push(`/?${params.toString()}`);
  }, [router, searchParams]);

  const clearFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (view === "board") params.set("view", "board");
    router.push(params.toString() ? `/?${params.toString()}` : "/");
  }, [router, view]);

  const setView = useCallback(
    (v: "list" | "board") => {
      const params = new URLSearchParams(searchParams.toString());
      if (v === "list") {
        params.delete("view");
      } else {
        params.set("view", v);
      }
      router.push(`/?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <SlidersHorizontal size={14} className="text-[var(--muted)]" />

      <div
        className="flex items-center rounded-sm border overflow-hidden"
        style={{ borderColor: "var(--border)" }}
      >
        <button
          onClick={() => setView("list")}
          title="List view"
          className="flex items-center justify-center h-8 w-8 transition-colors"
          style={{
            background: view === "list" ? "var(--surface-2)" : "transparent",
            color: view === "list" ? "var(--foreground)" : "var(--muted)",
          }}
        >
          <List size={12} />
        </button>
        <button
          onClick={() => setView("board")}
          title="Board view"
          className="flex items-center justify-center h-8 w-8 transition-colors"
          style={{
            background: view === "board" ? "var(--surface-2)" : "transparent",
            color: view === "board" ? "var(--foreground)" : "var(--muted)",
          }}
        >
          <LayoutGrid size={12} />
        </button>
      </div>

      <FilterSelect
        value={status}
        onChange={(v) => update("status", v)}
        options={STATUS_OPTIONS}
      />

      {!parentId && (
        <FilterSelect
          value={taskType}
          onChange={(v) => update("taskType", v)}
          options={TASK_TYPE_OPTIONS}
        />
      )}

      {parentId && (
        <span
          className="flex items-center gap-1.5 mono text-[10px] h-8 px-2.5 rounded-sm border"
          style={{ borderColor: "var(--border)", color: "var(--foreground)", background: "var(--surface-2)" }}
        >
          <span className="text-[var(--muted)]">↳ subtasks of</span>
          <span className="truncate max-w-[160px]">{parentTitle || parentId}</span>
          <button
            onClick={clearParentFilter}
            className="ml-0.5 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            title="Clear parent filter"
          >
            <X size={10} />
          </button>
        </span>
      )}

      <FilterSelect
        value={sortBy}
        onChange={(v) => update("sortBy", v)}
        options={SORT_OPTIONS}
      />

      <button
        onClick={toggleOrder}
        title={effectiveOrder === "asc" ? "Ascending" : "Descending"}
        className="flex items-center justify-center h-8 w-8 rounded-sm border transition-colors hover:border-[var(--border-hover)] hover:text-[var(--foreground)]"
        style={{ borderColor: "var(--border)", color: "var(--muted)", background: "var(--surface-2)" }}
      >
        {effectiveOrder === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
      </button>

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
