import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ColorScheme } from '@/constants/theme';

interface ThemeState {
  mode: ColorScheme;
}

const initialState: ThemeState = {
  mode: 'light',
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    toggleTheme(state) {
      state.mode = state.mode === 'light' ? 'dark' : 'light';
    },
    setTheme(state, action: PayloadAction<ColorScheme>) {
      state.mode = action.payload;
    },
  },
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export const themeReducer = themeSlice.reducer;
