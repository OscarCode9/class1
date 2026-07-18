import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '@/store/slices/authSlice';
import { tasksReducer } from '@/store/slices/tasksSlice';
import { themeReducer } from '@/store/slices/themeSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    tasks: tasksReducer,
    theme: themeReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
