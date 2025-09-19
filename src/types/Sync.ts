export type SyncStatus = 'idle' | 'syncing' | 'error';

export interface SyncState {
  status: SyncStatus;
  lastSyncAt?: string;
  error?: string;
  unsyncedCount: number;
}

export interface SyncResult {
  success: boolean;
  error?: string;
  conflictedIds?: string[];
  pushedCount: number;
  pulledCount: number;
}