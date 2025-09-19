import * as SQLite from 'expo-sqlite';
import { Task, CreateTaskInput, UpdateTaskInput, TaskFilter } from '../types/Task';
import { getDatabase } from './index';

// Helper to convert SQLite row to Task
function rowToTask(row: any): Task {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes || undefined,
    isDone: Boolean(row.isDone),
    dueAt: row.dueAt || undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    dirty: Boolean(row.dirty),
    deleted: Boolean(row.deleted),
    lastSyncAt: row.lastSyncAt || undefined,
  };
}

// Enhanced batch operation result
interface BatchOperationResult {
  success: boolean;
  affectedCount: number;
  errors: string[];
}

export class TaskQueries {
  private static async getDb(): Promise<SQLite.SQLiteDatabase> {
    return await getDatabase();
  }

  static async createTask(input: CreateTaskInput): Promise<Task> {
    const db = await this.getDb();
    const now = new Date().toISOString();
    const id = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const task: Task = {
      id,
      title: input.title,
      notes: input.notes,
      isDone: false,
      dueAt: input.dueAt,
      createdAt: now,
      updatedAt: now,
      dirty: true,
      deleted: false,
    };

    await db.runAsync(
      `INSERT INTO tasks (id, title, notes, isDone, dueAt, createdAt, updatedAt, dirty, deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        task.id,
        task.title,
        task.notes || null,
        task.isDone ? 1 : 0,
        task.dueAt || null,
        task.createdAt,
        task.updatedAt,
        task.dirty ? 1 : 0,
        task.deleted ? 1 : 0,
      ]
    );

    return task;
  }

  static async updateTask(input: UpdateTaskInput): Promise<Task | null> {
    const db = await this.getDb();
    const now = new Date().toISOString();

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];

    if (input.title !== undefined) {
      updates.push('title = ?');
      values.push(input.title);
    }
    if (input.notes !== undefined) {
      updates.push('notes = ?');
      values.push(input.notes || null);
    }
    if (input.isDone !== undefined) {
      updates.push('isDone = ?');
      values.push(input.isDone ? 1 : 0);
    }
    if (input.dueAt !== undefined) {
      updates.push('dueAt = ?');
      values.push(input.dueAt || null);
    }

    if (updates.length === 0) {
      // No updates, return existing task
      return await this.getTaskById(input.id);
    }

    // Add standard update fields
    updates.push('updatedAt = ?', 'dirty = ?');
    values.push(now, 1);
    values.push(input.id); // For WHERE clause

    const result = await db.runAsync(
      `UPDATE tasks SET ${updates.join(', ')} WHERE id = ? AND deleted = 0`,
      values
    );

    if (result.changes === 0) {
      return null; // Task not found or already deleted
    }

    return await this.getTaskById(input.id);
  }

  static async deleteTask(id: string): Promise<boolean> {
    const db = await this.getDb();
    const now = new Date().toISOString();

    const result = await db.runAsync(
      'UPDATE tasks SET deleted = 1, updatedAt = ?, dirty = 1 WHERE id = ? AND deleted = 0',
      [now, id]
    );

    return result.changes > 0;
  }

  static async getTaskById(id: string): Promise<Task | null> {
    const db = await this.getDb();
    const row = await db.getFirstAsync(
      'SELECT * FROM tasks WHERE id = ? AND deleted = 0',
      [id]
    );

    return row ? rowToTask(row) : null;
  }

  static async getTasks(filter: TaskFilter = 'all', limit?: number, offset?: number): Promise<Task[]> {
    const db = await this.getDb();

    let whereClause = 'WHERE deleted = 0';
    const params: any[] = [];

    if (filter === 'completed') {
      whereClause += ' AND isDone = 1';
    } else if (filter === 'pending') {
      whereClause += ' AND isDone = 0';
    }

    let query = `SELECT * FROM tasks ${whereClause} ORDER BY createdAt DESC`;

    if (limit) {
      query += ' LIMIT ?';
      params.push(limit);
      
      if (offset) {
        query += ' OFFSET ?';
        params.push(offset);
      }
    }

    const rows = await db.getAllAsync(query, params);
    return rows.map(rowToTask);
  }

  static async getTasksCount(filter: TaskFilter = 'all'): Promise<number> {
    const db = await this.getDb();

    let whereClause = 'WHERE deleted = 0';
    const params: any[] = [];

    if (filter === 'completed') {
      whereClause += ' AND isDone = 1';
    } else if (filter === 'pending') {
      whereClause += ' AND isDone = 0';
    }

    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM tasks ${whereClause}`,
      params
    );

    return result?.count || 0;
  }

  static async getUnsyncedTasks(): Promise<Task[]> {
    const db = await this.getDb();
    const rows = await db.getAllAsync(
      'SELECT * FROM tasks WHERE dirty = 1 ORDER BY updatedAt ASC'
    );
    return rows.map(rowToTask);
  }

  static async getUnsyncedCount(): Promise<number> {
    const db = await this.getDb();
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM tasks WHERE dirty = 1'
    );
    return result?.count || 0;
  }

  // Enhanced batch sync operations with transaction support
  static async markTasksSynced(ids: string[]): Promise<BatchOperationResult> {
    if (ids.length === 0) {
      return { success: true, affectedCount: 0, errors: [] };
    }

    const db = await this.getDb();
    const now = new Date().toISOString();
    const errors: string[] = [];
    let affectedCount = 0;

    try {
      await db.withTransactionAsync(async () => {
        // Process in batches to avoid SQL parameter limits
        const BATCH_SIZE = 100;
        for (let i = 0; i < ids.length; i += BATCH_SIZE) {
          const batch = ids.slice(i, i + BATCH_SIZE);
          const placeholders = batch.map(() => '?').join(',');

          const result = await db.runAsync(
            `UPDATE tasks SET dirty = 0, lastSyncAt = ? WHERE id IN (${placeholders})`,
            [now, ...batch]
          );
          
          affectedCount += result.changes;
        }
      });

      return { success: true, affectedCount, errors };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to mark tasks as synced:', errorMessage);
      return { success: false, affectedCount: 0, errors: [errorMessage] };
    }
  }

  static async upsertTask(task: Task): Promise<void> {
    const db = await this.getDb();

    await db.runAsync(
      `INSERT OR REPLACE INTO tasks 
       (id, title, notes, isDone, dueAt, createdAt, updatedAt, dirty, deleted, lastSyncAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        task.id,
        task.title,
        task.notes || null,
        task.isDone ? 1 : 0,
        task.dueAt || null,
        task.createdAt,
        task.updatedAt,
        task.dirty ? 1 : 0,
        task.deleted ? 1 : 0,
        task.lastSyncAt || null,
      ]
    );
  }

  // Enhanced batch upsert with transaction support
  static async upsertTasks(tasks: Task[]): Promise<BatchOperationResult> {
    if (tasks.length === 0) {
      return { success: true, affectedCount: 0, errors: [] };
    }

    const db = await this.getDb();
    const errors: string[] = [];
    let affectedCount = 0;

    try {
      await db.withTransactionAsync(async () => {
        for (const task of tasks) {
          try {
            await db.runAsync(
              `INSERT OR REPLACE INTO tasks 
               (id, title, notes, isDone, dueAt, createdAt, updatedAt, dirty, deleted, lastSyncAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                task.id,
                task.title,
                task.notes || null,
                task.isDone ? 1 : 0,
                task.dueAt || null,
                task.createdAt,
                task.updatedAt,
                task.dirty ? 1 : 0,
                task.deleted ? 1 : 0,
                task.lastSyncAt || null,
              ]
            );
            affectedCount++;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            errors.push(`Failed to upsert task ${task.id}: ${errorMessage}`);
          }
        }
      });

      return { 
        success: errors.length === 0, 
        affectedCount, 
        errors 
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Batch upsert failed:', errorMessage);
      return { success: false, affectedCount: 0, errors: [errorMessage] };
    }
  }

  // Enhanced batch delete with proper cleanup
  static async permanentlyDeleteSyncedTasks(ids: string[]): Promise<BatchOperationResult> {
    if (ids.length === 0) {
      return { success: true, affectedCount: 0, errors: [] };
    }

    const db = await this.getDb();
    const errors: string[] = [];
    let affectedCount = 0;

    try {
      await db.withTransactionAsync(async () => {
        // Only delete tasks that are marked as deleted AND have been synced
        const BATCH_SIZE = 100;
        for (let i = 0; i < ids.length; i += BATCH_SIZE) {
          const batch = ids.slice(i, i + BATCH_SIZE);
          const placeholders = batch.map(() => '?').join(',');

          const result = await db.runAsync(
            `DELETE FROM tasks WHERE id IN (${placeholders}) AND deleted = 1 AND dirty = 0`,
            batch
          );
          
          affectedCount += result.changes;
        }
      });

      return { success: true, affectedCount, errors };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to permanently delete tasks:', errorMessage);
      return { success: false, affectedCount: 0, errors: [errorMessage] };
    }
  }

  // Sync metadata operations
  static async getSyncMetadata(key: string): Promise<string | null> {
    const db = await this.getDb();
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM sync_metadata WHERE key = ?',
      [key]
    );
    return row?.value || null;
  }

  static async setSyncMetadata(key: string, value: string): Promise<void> {
    const db = await this.getDb();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT OR REPLACE INTO sync_metadata (key, value, updatedAt) VALUES (?, ?, ?)`,
      [key, value, now]
    );
  }

  static async getAllSyncMetadata(): Promise<Record<string, string>> {
    const db = await this.getDb();
    const rows = await db.getAllAsync<{ key: string; value: string }>(
      'SELECT key, value FROM sync_metadata'
    );
    
    const metadata: Record<string, string> = {};
    for (const row of rows) {
      metadata[row.key] = row.value;
    }
    
    return metadata;
  }

  // Advanced queries for conflict resolution and debugging
  static async getConflictedTasks(): Promise<Task[]> {
    const db = await this.getDb();
    // Tasks that are both dirty (have local changes) and have been recently synced
    const rows = await db.getAllAsync(
      `SELECT * FROM tasks 
       WHERE dirty = 1 
       AND lastSyncAt IS NOT NULL 
       AND updatedAt > lastSyncAt
       AND deleted = 0
       ORDER BY updatedAt DESC`
    );
    return rows.map(rowToTask);
  }

  static async getTasksModifiedSince(timestamp: string): Promise<Task[]> {
    const db = await this.getDb();
    const rows = await db.getAllAsync(
      'SELECT * FROM tasks WHERE updatedAt > ? ORDER BY updatedAt ASC',
      [timestamp]
    );
    return rows.map(rowToTask);
  }

  static async getTasksNeedingSync(): Promise<{
    toCreate: Task[];
    toUpdate: Task[];
    toDelete: Task[];
  }> {
    const db = await this.getDb();
    
    const unsyncedTasks = await db.getAllAsync(
      'SELECT * FROM tasks WHERE dirty = 1 ORDER BY updatedAt ASC'
    );

    const tasks = unsyncedTasks.map(rowToTask);
    
    return {
      toCreate: tasks.filter(task => !task.lastSyncAt && !task.deleted),
      toUpdate: tasks.filter(task => task.lastSyncAt && !task.deleted),
      toDelete: tasks.filter(task => task.deleted),
    };
  }

  // Database maintenance operations
  static async getDbStats(): Promise<{
    totalTasks: number;
    activeTasks: number;
    deletedTasks: number;
    unsyncedTasks: number;
    conflictedTasks: number;
  }> {
    const db = await this.getDb();
    
    const [total, active, deleted, unsynced, conflicted] = await Promise.all([
      db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM tasks'),
      db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM tasks WHERE deleted = 0'),
      db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM tasks WHERE deleted = 1'),
      db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM tasks WHERE dirty = 1'),
      db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM tasks WHERE dirty = 1 AND lastSyncAt IS NOT NULL AND updatedAt > lastSyncAt AND deleted = 0'
      ),
    ]);

    return {
      totalTasks: total?.count || 0,
      activeTasks: active?.count || 0,
      deletedTasks: deleted?.count || 0,
      unsyncedTasks: unsynced?.count || 0,
      conflictedTasks: conflicted?.count || 0,
    };
  }

  // Cleanup old deleted tasks (should be called periodically)
  static async cleanupOldDeletedTasks(olderThanDays: number = 30): Promise<number> {
    const db = await this.getDb();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    const result = await db.runAsync(
      'DELETE FROM tasks WHERE deleted = 1 AND dirty = 0 AND updatedAt < ?',
      [cutoffDate.toISOString()]
    );

    console.log(`Cleaned up ${result.changes} old deleted tasks`);
    return result.changes;
  }
}