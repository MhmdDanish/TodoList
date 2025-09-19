import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { SyncStatus, SyncResult } from '../types/Sync';
import { TaskQueries } from '../database/taskQueries';
import { SyncService } from '../services/syncService';

interface SyncState {
  status: SyncStatus;
  lastSyncAt?: string;
  error?: string;
  unsyncedCount: number;
  isOnline: boolean;
  retryCount: number;
  nextRetryAt?: string;
}

const initialState: SyncState = {
  status: 'idle',
  unsyncedCount: 0,
  isOnline: false,
  retryCount: 0,
};

export const updateUnsyncedCount = createAsyncThunk(
  'sync/updateUnsyncedCount',
  async () => {
    const count = await TaskQueries.getUnsyncedCount();
    return count;
  }
);

// Main sync operation
export const performSync = createAsyncThunk(
  'sync/performSync',
  async (): Promise<SyncResult> => {
    return await SyncService.performBidirectionalSync();
  }
);

const syncSlice = createSlice({
  name: 'sync',
  initialState,
  reducers: {
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      const wasOffline = !state.isOnline;
      state.isOnline = action.payload;
      
      if (action.payload && wasOffline) {
        state.error = undefined;
        state.retryCount = 0;
        state.nextRetryAt = undefined;
      }
      
      if (!action.payload) {
        state.status = 'idle';
      }
    },
    setSyncStatus: (state, action: PayloadAction<SyncStatus>) => {
      state.status = action.payload;
    },
    setSyncError: (state, action: PayloadAction<string>) => {
      state.status = 'error';
      state.error = action.payload;
      state.retryCount += 1;
      
      const baseDelay = 1000; // 1 second
      const maxDelay = 30000; // 30 seconds
      const delay = Math.min(baseDelay * Math.pow(2, state.retryCount - 1), maxDelay);
      state.nextRetryAt = new Date(Date.now() + delay).toISOString();
    },
    clearSyncError: (state) => {
      state.error = undefined;
      state.retryCount = 0;
      state.nextRetryAt = undefined;
      if (state.status === 'error') {
        state.status = 'idle';
      }
    },
    resetRetryCount: (state) => {
      state.retryCount = 0;
      state.nextRetryAt = undefined;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(updateUnsyncedCount.fulfilled, (state, action) => {
        state.unsyncedCount = action.payload;
      })
      
      .addCase(performSync.pending, (state) => {
        state.status = 'syncing';
        state.error = undefined;
      })
      .addCase(performSync.fulfilled, (state, action) => {
        const result = action.payload;
        if (result.success) {
          state.status = 'idle';
          state.error = undefined;
          state.retryCount = 0;
          state.nextRetryAt = undefined;
          state.lastSyncAt = new Date().toISOString();
          
          if (result.conflictedIds && result.conflictedIds.length > 0) {
            console.warn(`Sync completed with ${result.conflictedIds.length} conflicts`);
          }
        } else {
          state.status = 'error';
          state.error = result.error || 'Sync failed';
          state.retryCount += 1;
          
          const baseDelay = 1000;
          const maxDelay = 30000;
          const delay = Math.min(baseDelay * Math.pow(2, state.retryCount - 1), maxDelay);
          state.nextRetryAt = new Date(Date.now() + delay).toISOString();
        }
      })
      .addCase(performSync.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.error.message || 'Sync failed';
        state.retryCount += 1;
        
        const baseDelay = 1000;
        const maxDelay = 30000;
        const delay = Math.min(baseDelay * Math.pow(2, state.retryCount - 1), maxDelay);
        state.nextRetryAt = new Date(Date.now() + delay).toISOString();
      });
  },
});

export const {
  setOnlineStatus,
  setSyncStatus,
  setSyncError,
  clearSyncError,
  resetRetryCount,
} = syncSlice.actions;

export default syncSlice.reducer;