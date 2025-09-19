import { configureStore } from '@reduxjs/toolkit';
import { createSelector } from '@reduxjs/toolkit';
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import taskReducer from './taskSlice';
import syncReducer from './syncSlice';

export const store = configureStore({
  reducer: {
    tasks: taskReducer,
    sync: syncReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Basic selectors
export const selectTasks = (state: RootState) => state.tasks.tasks;
export const selectTasksLoading = (state: RootState) => state.tasks.loading;
export const selectTasksError = (state: RootState) => state.tasks.error;
export const selectTaskFilter = (state: RootState) => state.tasks.filter;
export const selectSelectedTaskId = (state: RootState) => state.tasks.selectedTaskId;

export const selectFilteredTasks = createSelector(
  [selectTasks, selectTaskFilter],
  (tasks, filter) => {
    switch (filter) {
      case 'completed':
        return tasks.filter(task => task.isDone);
      case 'pending':
        return tasks.filter(task => !task.isDone);
      default:
        return tasks;
    }
  }
);

export const selectTaskStats = createSelector(
  [selectTasks],
  (tasks) => ({
    total: tasks.length,
    completed: tasks.filter(t => t.isDone).length,
    pending: tasks.filter(t => !t.isDone).length,
    overdue: tasks.filter(t => 
      t.dueAt && !t.isDone && new Date(t.dueAt) < new Date()
    ).length,
  })
);

export const selectSyncStatus = (state: RootState) => state.sync.status;
export const selectSyncError = (state: RootState) => state.sync.error;
export const selectUnsyncedCount = (state: RootState) => state.sync.unsyncedCount;
export const selectIsOnline = (state: RootState) => state.sync.isOnline;
export const selectLastSyncAt = (state: RootState) => state.sync.lastSyncAt;
export const selectNextRetryAt = (state: RootState) => state.sync.nextRetryAt;