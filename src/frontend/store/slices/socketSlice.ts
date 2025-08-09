import { Connect } from '@/frontend/typing';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SocketState {
  connected: boolean;
  isConnecting: boolean;
  allowRestart: boolean;
  lastConfig?: Connect;
  reconnectDelay: number;
  isRestarting: boolean;
  error?: string;
}

const initialState: SocketState = {
  connected: false,
  isConnecting: false,
  allowRestart: true,
  reconnectDelay: 3000,
  isRestarting: false
};

const socketSlice = createSlice({
  name: 'socket',
  initialState,
  reducers: {
    wsConnectRequest(state, action: PayloadAction<Connect>) {
      state.isConnecting = true;
      state.lastConfig = action.payload;
      state.error = undefined;
    },
    wsConnected(state) {
      state.connected = true;
      state.isConnecting = false;
      state.isRestarting = false;
    },
    wsDisconnected(state) {
      state.connected = false;
      state.isConnecting = false;
    },
    wsSetError(state, action: PayloadAction<string | undefined>) {
      state.error = action.payload;
    },
    wsSetAllowRestart(state, action: PayloadAction<boolean>) {
      state.allowRestart = action.payload;
    },
    wsScheduleRestart(state) {
      state.isRestarting = true;
    },
    wsCancel(state) {
      state.isConnecting = false;
      state.allowRestart = false;
    }
  }
});

export const {
  wsConnectRequest,
  wsConnected,
  wsDisconnected,
  wsSetError,
  wsSetAllowRestart,
  wsScheduleRestart,
  wsCancel
} = socketSlice.actions;

export default socketSlice.reducer;
