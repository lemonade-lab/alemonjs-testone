import { initBot, initUser } from '@/frontend/config';
import { User } from '@/frontend/typing';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UserState {
  users: User[];
  bot?: User;
  current?: User;
}

const initialState: UserState = {
  users: [initUser],
  bot: initBot,
  current: initUser
};

const userSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    setUsers(state, action: PayloadAction<User[]>) {
      if (Array.isArray(action.payload)) {
        if (action.payload.length) {
          state.users = action.payload;
        } else {
          state.users = [initUser];
        }
      } else {
        state.users = [initUser];
      }
    },
    setBot(state, action: PayloadAction<User | undefined>) {
      if (action.payload) {
        state.bot = action.payload;
      } else {
        state.bot = initBot;
      }
    },
    setCurrentUser(state, action: PayloadAction<User | undefined>) {
      if (action.payload) {
        state.current = action.payload;
      } else {
        state.current = initUser;
      }
    }
  }
});

export const { setUsers, setBot, setCurrentUser } = userSlice.actions;
export default userSlice.reducer;
