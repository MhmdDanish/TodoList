export interface Task {
  id: string;
  title: string;
  notes?: string;
  isDone: boolean;
  dueAt?: string; // ISO string
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  dirty: boolean; // Has local changes not synced
  deleted: boolean; // Soft delete flag
  lastSyncAt?: string; // ISO string
}

export interface CreateTaskInput {
  title: string;
  notes?: string;
  dueAt?: string;
}

export interface UpdateTaskInput {
  id: string;
  title?: string;
  notes?: string;
  isDone?: boolean;
  dueAt?: string;
}

export type TaskFilter = 'all' | 'completed' | 'pending';