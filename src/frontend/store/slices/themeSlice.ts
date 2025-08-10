import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type ThemeType = 'default' | 'web3';

interface ThemeState {
  current: ThemeType;
}

const initialState: ThemeState = {
  current: 'default'
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<ThemeType>) {
      state.current = action.payload;
    },
    toggleTheme(state) {
      state.current = state.current === 'default' ? 'web3' : 'default';
    }
  }
});

export const { setTheme, toggleTheme } = themeSlice.actions;
export default themeSlice.reducer;
