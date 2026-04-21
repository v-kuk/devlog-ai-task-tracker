"use client";

import { useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { CreateTaskInputSchema } from "@/types";
import type { Task, CreateTaskInput } from "@/types";

interface TaskFormProps {
  initialValues?: Partial<Task>;
  onSubmit: (data: CreateTaskInput) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

interface FormErrors {
  title?: string;
  description?: string;
}

const STATUS_OPTIONS: { value: Task["status"]; label: string }[] = [
  { value: "todo",        label: "Todo" },
  { value: "in-progress", label: "In Progress" },
  { value: "done",        label: "Done" },
];

const PRIORITY_OPTIONS: { value: Task["priority"]; label: string; color: string }[] = [
  { value: "low",    label: "Low",    color: "#22c55e" },
  { value: "medium", label: "Medium", color: "#f59e0b" },
  { value: "high",   label: "High",   color: "#ef4444" },
];

const fieldStyle = {
  background: "var(--surface-2)",
  borderColor: "var(--border)",
  color: "var(--foreground)",
};

interface StyledSelectProps {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; color?: string }[];
  disabled?: boolean;
}

function StyledSelect({ value, onChange, options, disabled }: StyledSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="h-10 w-full rounded-sm border px-3 text-sm appearance-none cursor-pointer focus:outline-none focus:border-[var(--primary)] disabled:opacity-50"
      style={fieldStyle}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} style={{ background: "var(--surface-2)" }}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export function TaskForm({ initialValues, onSubmit, onCancel, isLoading }: TaskFormProps) {
  const [title, setTitle]             = useState(initialValues?.title ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [status, setStatus]           = useState<Task["status"]>(initialValues?.status ?? "todo");
  const [priority, setPriority]       = useState<Task["priority"]>(initialValues?.priority ?? "medium");
  const [errors, setErrors]           = useState<FormErrors>({});

  const validate = useCallback((): boolean => {
    const result = CreateTaskInputSchema.safeParse({ title, description, status, priority });
    if (!result.success) {
      const fieldErrors: FormErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FormErrors;
        if (field === "title" || field === "description") {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  }, [title, description, status, priority]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;
    await onSubmit({ title: title.trim(), description: description.trim(), status, priority });
  }, [validate, onSubmit, title, description, status, priority]);

  const labelStyle = "block text-xs font-medium mono tracking-wider mb-1.5 text-[var(--muted-foreground)] uppercase";
  const inputStyle = "h-10 w-full rounded-sm border px-3 text-sm transition-colors focus:outline-none focus:border-[var(--primary)]";

  return (
    <div className="space-y-5">
      {/* Title */}
      <div>
        <label className={labelStyle}>
          Title <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setErrors((er) => ({ ...er, title: undefined })); }}
          placeholder="What needs to be done?"
          maxLength={100}
          disabled={isLoading}
          className={`${inputStyle} ${errors.title ? "border-red-500" : "border-[var(--border)]"}`}
          style={fieldStyle}
        />
        <div className="flex justify-between mt-1">
          {errors.title ? (
            <p className="text-xs text-red-400">{errors.title}</p>
          ) : <span />}
          <p className={`text-[10px] mono ml-auto ${title.length > 90 ? "text-amber-400" : "text-[var(--muted)]"}`}>
            {title.length}/100
          </p>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className={labelStyle}>Description</label>
        <textarea
          value={description}
          onChange={(e) => { setDescription(e.target.value); setErrors((er) => ({ ...er, description: undefined })); }}
          placeholder="Add details, context, or acceptance criteria..."
          maxLength={500}
          rows={4}
          disabled={isLoading}
          className={`w-full rounded-sm border px-3 py-2.5 text-sm transition-colors focus:outline-none focus:border-[var(--primary)] resize-none disabled:opacity-50 ${errors.description ? "border-red-500" : "border-[var(--border)]"}`}
          style={fieldStyle}
        />
        <div className="flex justify-between mt-1">
          {errors.description ? (
            <p className="text-xs text-red-400">{errors.description}</p>
          ) : <span />}
          <p className={`text-[10px] mono ml-auto ${description.length > 450 ? "text-amber-400" : "text-[var(--muted)]"}`}>
            {description.length}/500
          </p>
        </div>
      </div>

      {/* Status + Priority row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelStyle}>Status</label>
          <StyledSelect
            value={status}
            onChange={(v) => setStatus(v as Task["status"])}
            options={STATUS_OPTIONS}
            disabled={isLoading}
          />
        </div>
        <div>
          <label className={labelStyle}>Priority</label>
          <StyledSelect
            value={priority}
            onChange={(v) => setPriority(v as Task["priority"])}
            options={PRIORITY_OPTIONS}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm rounded-sm border transition-colors hover:border-[var(--border-hover)] hover:text-[var(--foreground)]"
          style={{ borderColor: "var(--border)", color: "var(--muted)", background: "transparent" }}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: "var(--accent)", color: "#000" }}
        >
          {isLoading && <Loader2 size={14} className="animate-spin" />}
          {isLoading ? "Saving..." : "Save task"}
        </button>
      </div>
    </div>
  );
}
