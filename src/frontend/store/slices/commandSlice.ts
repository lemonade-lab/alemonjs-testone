import { initCommand } from '@/frontend/config';
import { Command } from '@/frontend/typing';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CommandState {
  commands: Command[];
}

const initialState: CommandState = {
  commands: [initCommand]
};

const commandSlice = createSlice({
  name: 'commands',
  initialState,
  reducers: {
    setCommands(state, action: PayloadAction<Command[]>) {
      if (Array.isArray(action.payload)) {
        if (action.payload.length) {
          state.commands = action.payload;
        } else {
          state.commands = [initCommand];
        }
      } else {
        state.commands = [initCommand];
      }
    }
  }
});

export const { setCommands } = commandSlice.actions;
export default commandSlice.reducer;
