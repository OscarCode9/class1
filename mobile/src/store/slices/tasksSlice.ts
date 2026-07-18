import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { tasksService } from '@/services/tasks.service';
import type {
  CreateTaskPayload,
  Task,
  TaskFilters,
  TasksMeta,
  UpdateTaskPayload,
} from '@/types/task.types';

interface TasksState {
  items: Task[];
  meta: TasksMeta;
  filters: TaskFilters;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  mutating: boolean;
  error: string | null;
}

const initialState: TasksState = {
  items: [],
  meta: { page: 1, limit: 50, total: 0, totalPages: 0 },
  filters: {
    search: '',
    status: '',
    priority: '',
    tag: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  },
  status: 'idle',
  mutating: false,
  error: null,
};

export const fetchTasks = createAsyncThunk(
  'tasks/fetch',
  async (
    args: { assigneeId?: string } | undefined,
    { getState, rejectWithValue },
  ) => {
    try {
      const state = getState() as { tasks: TasksState };
      const { filters } = state.tasks;
      return await tasksService.list({
        page: 1,
        limit: 50,
        search: filters.search || undefined,
        status: filters.status || undefined,
        priority: filters.priority || undefined,
        tag: filters.tag || undefined,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        assigneeId: args?.assigneeId,
      });
    } catch (e) {
      return rejectWithValue(
        e instanceof Error ? e.message : 'Failed to load tasks',
      );
    }
  },
);

export const createTask = createAsyncThunk(
  'tasks/create',
  async (
    payload: CreateTaskPayload,
    { rejectWithValue },
  ) => {
    try {
      return await tasksService.create(payload);
    } catch (e) {
      return rejectWithValue(
        e instanceof Error ? e.message : 'Failed to create task',
      );
    }
  },
);

export const updateTask = createAsyncThunk(
  'tasks/update',
  async (
    { id, payload }: { id: string; payload: UpdateTaskPayload },
    { rejectWithValue },
  ) => {
    try {
      return await tasksService.update(id, payload);
    } catch (e) {
      return rejectWithValue(
        e instanceof Error ? e.message : 'Failed to update task',
      );
    }
  },
);

export const deleteTask = createAsyncThunk(
  'tasks/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await tasksService.remove(id);
      return id;
    } catch (e) {
      return rejectWithValue(
        e instanceof Error ? e.message : 'Failed to delete task',
      );
    }
  },
);

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setFilters(state, action: PayloadAction<Partial<TaskFilters>>) {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters(state) {
      state.filters = initialState.filters;
    },
    clearTasksError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload.data;
        state.meta = action.payload.meta;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) ?? 'Failed to load tasks';
      })
      .addCase(createTask.pending, (state) => {
        state.mutating = true;
        state.error = null;
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.mutating = false;
        state.items = [action.payload, ...state.items];
        state.meta.total += 1;
      })
      .addCase(createTask.rejected, (state, action) => {
        state.mutating = false;
        state.error = (action.payload as string) ?? 'Failed to create task';
      })
      .addCase(updateTask.pending, (state) => {
        state.mutating = true;
        state.error = null;
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        state.mutating = false;
        const idx = state.items.findIndex((t) => t.id === action.payload.id);
        if (idx >= 0) {
          state.items[idx] = action.payload;
        }
      })
      .addCase(updateTask.rejected, (state, action) => {
        state.mutating = false;
        state.error = (action.payload as string) ?? 'Failed to update task';
      })
      .addCase(deleteTask.pending, (state) => {
        state.mutating = true;
        state.error = null;
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.mutating = false;
        state.items = state.items.filter((t) => t.id !== action.payload);
        state.meta.total = Math.max(0, state.meta.total - 1);
      })
      .addCase(deleteTask.rejected, (state, action) => {
        state.mutating = false;
        state.error = (action.payload as string) ?? 'Failed to delete task';
      });
  },
});

export const { setFilters, resetFilters, clearTasksError } = tasksSlice.actions;
export const tasksReducer = tasksSlice.reducer;
