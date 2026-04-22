import { z } from "zod";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const TaskStatus = z.enum(["todo", "in-progress", "done"]);
export const TaskPriority = z.enum(["low", "medium", "high"]);

export type TaskStatus = z.infer<typeof TaskStatus>;
export type TaskPriority = z.infer<typeof TaskPriority>;

// ─── Task ─────────────────────────────────────────────────────────────────────

export interface Task {
  id: string;
  sequence: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: number;
  updatedAt: number;
  parentTaskId: string | null;
}

// ─── Task Filters ─────────────────────────────────────────────────────────────

export const TaskFiltersSchema = z.object({
  status: TaskStatus.optional(),
  priority: TaskPriority.optional(),
  search: z.string().optional(),
});

export type TaskFilters = z.infer<typeof TaskFiltersSchema>;

// ─── Create Task Input ────────────────────────────────────────────────────────

export const CreateTaskInputSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title too long"),
  description: z.string().max(5000, "Description too long").default(""),
  status: TaskStatus.default("todo"),
  priority: TaskPriority.default("medium"),
  parentTaskId: z.string().nullable().optional(),
});

export type CreateTaskInput = z.infer<typeof CreateTaskInputSchema>;

// ─── Update Task Input ────────────────────────────────────────────────────────

export const UpdateTaskInputSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title too long").optional(),
  description: z.string().max(5000, "Description too long").optional(),
  status: TaskStatus.optional(),
  priority: TaskPriority.optional(),
});

export type UpdateTaskInput = z.infer<typeof UpdateTaskInputSchema>;

// ─── Agent Result ─────────────────────────────────────────────────────────────

export interface ToolCallLog {
  tool: string;
  input: Record<string, unknown>;
  output: string;
}

export interface AgentRecommendation {
  taskId: string;
  title?: string;
  reason: string;
  suggestedPriority?: TaskPriority;
}

export interface BlockedTaskReport {
  task: Task;
  daysStuck: number;
  questions: string[];
  nextActions: string[];
}

interface AgentResultBase {
  content: string;
  toolCallLog?: ToolCallLog[];
  mocked?: boolean;
  notice?: string;
}

export interface PrioritizeResult extends AgentResultBase {
  type: "prioritize";
  summary?: string;
  recommendations: AgentRecommendation[];
}

export interface DecomposeResultClarification extends AgentResultBase {
  type: "decompose";
  needsClarification: true;
  question: string;
}

export interface DecomposeResultDone extends AgentResultBase {
  type: "decompose";
  needsClarification: false;
  summary?: string;
  subtasks: Task[];
}

export type DecomposeResult = DecomposeResultClarification | DecomposeResultDone;

export interface UnblockResult extends AgentResultBase {
  type: "unblock";
  summary?: string;
  blockedTasks: BlockedTaskReport[];
}

export type AgentResult = PrioritizeResult | DecomposeResult | UnblockResult;

// ─── API Response Helpers ─────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  data: T;
  error?: never;
}

export interface ApiError {
  data?: never;
  error: string;
  details?: unknown;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
