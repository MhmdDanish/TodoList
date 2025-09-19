import { useEffect, useCallback } from 'react';
import { 
  useAppDispatch, 
  useAppSelector, 
  selectFilteredTasks,
  selectTasksLoading,
  selectTasksError,
  selectTaskFilter,
  selectTaskStats,
} from '../store';
import {
  loadTasks,
  createTask,
  updateTask,
  deleteTask,
  toggleTaskComplete,
  setFilter,
  clearError,
} from '../store/taskSlice';
import { updateUnsyncedCount } from '../store/syncSlice';
import { Task, TaskFilter, CreateTaskInput, UpdateTaskInput } from '../types/Task';

export function useTasks() {
  const dispatch = useAppDispatch();
  
  const tasks = useAppSelector(selectFilteredTasks);
  const loading = useAppSelector(selectTasksLoading);
  const error = useAppSelector(selectTasksError);
  const currentFilter = useAppSelector(selectTaskFilter);
  const stats = useAppSelector(selectTaskStats);

  // Load ALL tasks when component mounts (not just filtered ones)
  useEffect(() => {
    dispatch(loadTasks('all')); // Always load all tasks
  }, [dispatch]);

  // Update unsynced count when stats change
  useEffect(() => {
    dispatch(updateUnsyncedCount());
  }, [dispatch, stats.total]);

  // Action creators with immediate state refresh
  const actions = {
    createTask: useCallback(async (input: CreateTaskInput) => {
      try {
        await dispatch(createTask(input)).unwrap();
        // Immediately refresh all tasks to ensure Redux has latest data
        dispatch(loadTasks('all'));
        dispatch(updateUnsyncedCount());
      } catch (error) {
        console.error('Failed to create task:', error);
        throw error;
      }
    }, [dispatch]),

    updateTask: useCallback(async (input: UpdateTaskInput) => {
      try {
        await dispatch(updateTask(input)).unwrap();
        // Immediately refresh all tasks
        dispatch(loadTasks('all'));
        dispatch(updateUnsyncedCount());
      } catch (error) {
        console.error('Failed to update task:', error);
        throw error;
      }
    }, [dispatch]),

    deleteTask: useCallback(async (id: string) => {
      try {
        await dispatch(deleteTask(id)).unwrap();
        // Immediately refresh all tasks
        dispatch(loadTasks('all'));
        dispatch(updateUnsyncedCount());
      } catch (error) {
        console.error('Failed to delete task:', error);
        throw error;
      }
    }, [dispatch]),

    toggleComplete: useCallback(async (task: Task) => {
      try {
        await dispatch(toggleTaskComplete(task)).unwrap();
        // Immediately refresh all tasks to get updated data
        dispatch(loadTasks('all'));
        dispatch(updateUnsyncedCount());
      } catch (error) {
        console.error('Failed to toggle task:', error);
        throw error;
      }
    }, [dispatch]),

    setFilter: useCallback((filter: TaskFilter) => {
      dispatch(setFilter(filter));
    }, [dispatch]),

    clearError: useCallback(() => {
      dispatch(clearError());
    }, [dispatch]),

    refresh: useCallback(async () => {
      try {
        await dispatch(loadTasks('all')).unwrap();
      } catch (error) {
        console.error('Failed to refresh tasks:', error);
      }
    }, [dispatch]),
  };

  return {
    // Data
    tasks,
    loading,
    error,
    currentFilter,
    stats,
    
    // Actions
    ...actions,
  };
}