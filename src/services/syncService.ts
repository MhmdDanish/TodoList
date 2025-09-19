import { Task } from '../types/Task';
import { SyncResult } from '../types/Sync';
import { APIService } from './apiService';
import { TaskQueries } from '../database/taskQueries';
import { getDatabase } from '../database';

export class SyncService {
  private static isRunning = false;
  private static lastPullTime?: string;
  private static readonly BATCH_SIZE = 50; // Process in smaller batches
  private static readonly MAX_RETRIES = 3;

  static async performBidirectionalSync(): Promise<SyncResult> {
    if (this.isRunning) {
      throw new Error('Sync already in progress');
    }

    this.isRunning = true;

    try {
      await this.loadLastSyncTime();

      const pushResult = await this.pushLocalChanges();

      const pullResult = await this.pullRemoteChanges();

      await this.updateLastSyncTime();

      const totalResult: SyncResult = {
        success: true,
        pushedCount: pushResult.pushedCount,
        pulledCount: pullResult.pulledCount,
        conflictedIds: [...(pushResult.conflictedIds || []), ...(pullResult.conflictedIds || [])],
      };

      return totalResult;

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown sync error',
        pushedCount: 0,
        pulledCount: 0,
      };
    } finally {
      this.isRunning = false;
    }
  }

  private static async pushLocalChanges(): Promise<{ pushedCount: number; conflictedIds?: string[] }> {
    console.log('Starting push phase...');
    
    // Get all dirty tasks
    const unsyncedTasks = await TaskQueries.getUnsyncedTasks();
    console.log(`Found ${unsyncedTasks.length} unsynced tasks`);

    if (unsyncedTasks.length === 0) {
      return { pushedCount: 0 };
    }

    let totalPushed = 0;
    let allConflictedIds: string[] = [];

    // Process in batches to avoid overwhelming the server
    for (let i = 0; i < unsyncedTasks.length; i += this.BATCH_SIZE) {
      const batch = unsyncedTasks.slice(i, i + this.BATCH_SIZE);
      
      // Separate upserts and deletes
      const upserts = batch.filter(task => !task.deleted);
      const deletes = batch
        .filter(task => task.deleted)
        .map(task => ({ id: task.id, updatedAt: task.updatedAt }));

      console.log(`Pushing batch ${Math.floor(i / this.BATCH_SIZE) + 1}: ${upserts.length} upserts, ${deletes.length} deletes`);

      let retryCount = 0;
      while (retryCount < this.MAX_RETRIES) {
        try {
          const response = await APIService.pushTasks(upserts, deletes);
          
          if (response.success) {
            await this.markBatchSynced(batch);
            
            totalPushed += batch.length;
            if (response.conflictedIds) {
              allConflictedIds.push(...response.conflictedIds);
            }
            break; 
          } else {
            throw new Error('Server rejected push request');
          }
        } catch (error) {
          retryCount++;
          if (retryCount >= this.MAX_RETRIES) {
            console.error(`Push batch failed after ${this.MAX_RETRIES} retries:`, error);
            throw error;
          }
          
          const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
          console.log(`Push batch failed, retrying in ${delay}ms... (attempt ${retryCount + 1}/${this.MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    return {
      pushedCount: totalPushed,
      conflictedIds: allConflictedIds,
    };
  }

  private static async markBatchSynced(tasks: Task[]): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    
    await db.withTransactionAsync(async () => {
      for (const task of tasks) {
        if (task.deleted) {
          // Remove deleted tasks 
          await db.runAsync('DELETE FROM tasks WHERE id = ?', [task.id]);
        } else {
          // Mark as synced
          await db.runAsync(
            'UPDATE tasks SET dirty = 0, lastSyncAt = ? WHERE id = ?',
            [now, task.id]
          );
        }
      }
    });
    
    console.log(`Marked batch of ${tasks.length} tasks as synced`);
  }

  private static async pullRemoteChanges(): Promise<{ pulledCount: number; conflictedIds?: string[] }> {
    
    let totalPulled = 0;
    let conflictedIds: string[] = [];
    let nextCursor: string | undefined;
    const changedSince = this.lastPullTime || '1970-01-01T00:00:00.000Z';


    let retryCount = 0;
    do {
      try {
        const response = await APIService.pullTasks(changedSince, 100);
        console.log(`Pulled ${response.items.length} tasks`);

        if (response.items.length > 0) {
          const conflicts = await this.applyRemoteChanges(response.items);
          conflictedIds.push(...conflicts);
          totalPulled += response.items.length;
        }

        nextCursor = response.nextCursor;
        retryCount = 0; 
        
      } catch (error) {
        retryCount++;
        if (retryCount >= this.MAX_RETRIES) {
          console.error(`Pull failed after ${this.MAX_RETRIES} retries:`, error);
          throw error;
        }
        
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
        console.log(`Pull failed, retrying in ${delay}ms... (attempt ${retryCount + 1}/${this.MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } while (nextCursor);

    return { pulledCount: totalPulled, conflictedIds };
  }

  private static async applyRemoteChanges(remoteTasks: Task[]): Promise<string[]> {
    console.log(`Applying ${remoteTasks.length} remote changes...`);
    const conflictedIds: string[] = [];
    const db = await getDatabase();

    await db.withTransactionAsync(async () => {
      for (const remoteTask of remoteTasks) {
        try {
          const localTask = await TaskQueries.getTaskById(remoteTask.id);

          if (localTask) {
            // Check for conflicts - only overwrite if remote is newer
            const localUpdated = new Date(localTask.updatedAt);
            const remoteUpdated = new Date(remoteTask.updatedAt);

            if (localTask.dirty && localUpdated > remoteUpdated) {
              // Local has unsynced changes and is newer - keep local, note conflict
              conflictedIds.push(remoteTask.id);
              console.log(`Conflict: Local task ${remoteTask.id} has unsynced changes and is newer`);
            } else {
              // Remote wins - apply remote version
              await this.upsertTaskInTransaction(db, {
                ...remoteTask,
                dirty: false,
                lastSyncAt: new Date().toISOString(),
              });
              console.log(`Updated task ${remoteTask.id} from remote`);
            }
          } else {
            // New task from remote
            await this.upsertTaskInTransaction(db, {
              ...remoteTask,
              dirty: false,
              lastSyncAt: new Date().toISOString(),
            });
            console.log(`Added new task ${remoteTask.id} from remote`);
          }
        } catch (error) {
          console.error(`Failed to apply remote task ${remoteTask.id}:`, error);
        }
      }
    });

    return conflictedIds;
  }

  private static async upsertTaskInTransaction(db: any, task: Task): Promise<void> {
    if (task.deleted) {
      await db.runAsync('DELETE FROM tasks WHERE id = ?', [task.id]);
    } else {
      await db.runAsync(
        `INSERT OR REPLACE INTO tasks 
         (id, title, notes, isDone, dueAt, createdAt, updatedAt, dirty, deleted, lastSyncAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          task.id,
          task.title,
          task.notes,
          task.isDone ? 1 : 0,
          task.dueAt,
          task.createdAt,
          task.updatedAt,
          task.dirty ? 1 : 0,
          task.deleted ? 1 : 0,
          task.lastSyncAt,
        ]
      );
    }
  }

  private static async loadLastSyncTime(): Promise<void> {
    const db = await getDatabase();
    const result = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM sync_metadata WHERE key = ?',
      ['lastPullAt']
    );
    
    this.lastPullTime = result?.value;
    console.log('Last pull time:', this.lastPullTime);
  }

  private static async updateLastSyncTime(): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    
    await db.runAsync(
      'INSERT OR REPLACE INTO sync_metadata (key, value, updatedAt) VALUES (?, ?, ?)',
      ['lastPullAt', now, now]
    );
    
    this.lastPullTime = now;
    console.log('Updated last pull time:', now);
  }

}