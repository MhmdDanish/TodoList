import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Task, TaskFilter, CreateTaskInput, UpdateTaskInput } from '../types/Task';
import { TaskQueries } from '../database/taskQueries';

interface TaskState {
  tasks: Task[];
  filter: TaskFilter;
  loading: boolean;
  error: string | null;
  selectedTaskId: string | null;
}

const initialState: TaskState = {
  tasks: [],
  filter: 'all',
  loading: false,
  error: null,
  selectedTaskId: null,
};

export const loadTasks = createAsyncThunk(
  'tasks/loadTasks',
  async (filter: TaskFilter = 'all') => {
    console.log('loadTasks called with filter:', filter);
    const tasks = await TaskQueries.getTasks(filter);
    console.log('loadTasks fetched tasks:', tasks.length);
    return { tasks, filter };
  }
);



export const createTask = createAsyncThunk(
  'tasks/createTask',
  async (input: CreateTaskInput) => {
    const task = await TaskQueries.createTask(input);
    return task;
  }
);

export const updateTask = createAsyncThunk(
  'tasks/updateTask',
  async (input: UpdateTaskInput) => {
    const task = await TaskQueries.updateTask(input);
    if (!task) {
      throw new Error('Task not found');
    }
    return task;
  }
);

export const deleteTask = createAsyncThunk(
  'tasks/deleteTask',
  async (id: string) => {
    const success = await TaskQueries.deleteTask(id);
    if (!success) {
      throw new Error('Failed to delete task');
    }
    return id;
  }
);

export const toggleTaskComplete = createAsyncThunk(
  'tasks/toggleTaskComplete',
  async (task: Task) => {
    const updated = await TaskQueries.updateTask({
      id: task.id,
      isDone: !task.isDone,
    });
    if (!updated) {
      throw new Error('Task not found');
    }
    return updated;
  }
);

const taskSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setFilter: (state, action: PayloadAction<TaskFilter>) => {
      state.filter = action.payload;
    },
    setSelectedTask: (state, action: PayloadAction<string | null>) => {
      state.selectedTaskId = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    refreshTasksFromDB: (state, action: PayloadAction<Task[]>) => {
      console.log('Manually refreshing tasks from DB:', action.payload.length);
      state.tasks = action.payload;
      state.loading = false;
      state.error = null;
    },
    upsertTasks: (state, action: PayloadAction<Task[]>) => {
      const newTasks = action.payload;
      newTasks.forEach((newTask) => {
        const existingIndex = state.tasks.findIndex(t => t.id === newTask.id);
        if (existingIndex >= 0) {
          state.tasks[existingIndex] = newTask;
        } else {
          state.tasks.push(newTask);
        }
      });
    },
    // Remove tasks that were deleted remotely
    removeTasks: (state, action: PayloadAction<string[]>) => {
      const idsToRemove = action.payload;
      state.tasks = state.tasks.filter(task => !idsToRemove.includes(task.id));
    },
  },
  extraReducers: (builder) => {
    // Load tasks
    builder
      .addCase(loadTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.tasks = action.payload.tasks;
        state.filter = action.payload.filter;
      })
      .addCase(loadTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to load tasks';
      })

    // Create task
    builder
      .addCase(createTask.pending, (state) => {
        state.error = null;
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.tasks.unshift(action.payload); // Add to beginning
      })
      .addCase(createTask.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to create task';
      })

    // Update task
    builder
      .addCase(updateTask.fulfilled, (state, action) => {
        const index = state.tasks.findIndex(t => t.id === action.payload.id);
        if (index >= 0) {
          state.tasks[index] = action.payload;
        }
      })
      .addCase(updateTask.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to update task';
      })

    // Delete task
    builder
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.tasks = state.tasks.filter(t => t.id !== action.payload);
        if (state.selectedTaskId === action.payload) {
          state.selectedTaskId = null;
        }
      })
      .addCase(deleteTask.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to delete task';
      })

    // Toggle complete
    builder
      .addCase(toggleTaskComplete.fulfilled, (state, action) => {
        const index = state.tasks.findIndex(t => t.id === action.payload.id);
        if (index >= 0) {
          state.tasks[index] = action.payload;
        }
      })
      .addCase(toggleTaskComplete.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to update task';
      });
  },
});

export const { setFilter, setSelectedTask, clearError, upsertTasks, removeTasks,refreshTasksFromDB } = taskSlice.actions;
export default taskSlice.reducer;