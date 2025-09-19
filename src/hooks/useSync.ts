import { useEffect, useCallback } from 'react';
import {
  useAppDispatch,
  useAppSelector,
  selectSyncStatus,
  selectSyncError,
  selectUnsyncedCount,
  selectIsOnline,
  selectLastSyncAt,
  selectNextRetryAt,
} from '../store';
import {
  performSync,
  updateUnsyncedCount,
  setOnlineStatus,
  clearSyncError,
} from '../store/syncSlice';
import { loadTasks, refreshTasksFromDB } from '../store/taskSlice'; // Add refreshTasksFromDB
import { TaskQueries } from '../database/taskQueries'; // Add this import
export function useSync() {
  const dispatch = useAppDispatch();

  const status = useAppSelector(selectSyncStatus);
  const error = useAppSelector(selectSyncError);
  const unsyncedCount = useAppSelector(selectUnsyncedCount);
  const isOnline = useAppSelector(selectIsOnline);
  const lastSyncAt = useAppSelector(selectLastSyncAt);
  const nextRetryAt = useAppSelector(selectNextRetryAt);

  // Initialize unsynced count on mount
  useEffect(() => {
    dispatch(updateUnsyncedCount());
  }, [dispatch]);

  // Auto-sync when coming online
  const actions = {
    sync: useCallback(async () => {

      if (!isOnline) {
        throw new Error('Cannot sync while offline');
      }

      if (status === 'syncing') {
        return;
      }

      try {
        await dispatch(performSync()).unwrap();
        const freshTasks = await TaskQueries.getTasks('all');
        dispatch(refreshTasksFromDB(freshTasks));

        dispatch(updateUnsyncedCount());

      } catch (error) {
        console.error('Sync failed:', error);
        throw error;
      }
    }, [dispatch, isOnline, status]),

    setOnlineStatus: useCallback((online: boolean) => {
      dispatch(setOnlineStatus(online));
    }, [dispatch]),

    clearError: useCallback(() => {
      dispatch(clearSyncError());
    }, [dispatch]),

    updateUnsyncedCount: useCallback(() => {
      dispatch(updateUnsyncedCount());
    }, [dispatch]),
  };

  // Computed values
  const canSync = isOnline && status !== 'syncing' && unsyncedCount > 0;
  const isSyncing = status === 'syncing';
  const hasError = status === 'error';
  const needsSync = unsyncedCount > 0;

  // Format sync status for display
  const statusText = (() => {
    if (!isOnline) return 'Offline';
    if (status === 'syncing') return 'Syncing...';
    if (status === 'error') return 'Sync Error';
    if (unsyncedCount === 0) return 'All synced';
    return `${unsyncedCount} unsynced`;
  })();

  return {
    status,
    error,
    unsyncedCount,
    isOnline,
    lastSyncAt,
    nextRetryAt,
    statusText,

    canSync,
    isSyncing,
    hasError,
    needsSync,

    ...actions,
  };
}