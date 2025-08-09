import { initChannel } from '@/frontend/config';
import { Channel } from '@/frontend/typing';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ChannelState {
  channels: Channel[];
  current?: Channel;
}

const initialState: ChannelState = {
  channels: [initChannel],
  current: initChannel
};

const channelSlice = createSlice({
  name: 'channels',
  initialState,
  reducers: {
    setChannels(state, action: PayloadAction<Channel[]>) {
      if (Array.isArray(action.payload)) {
        if (action.payload.length) {
          state.channels = action.payload;
        } else {
          state.channels = [initChannel];
        }
      } else {
        state.channels = [initChannel];
      }
    },
    setCurrentChannel(state, action: PayloadAction<Channel | undefined>) {
      state.current = action.payload;
    }
  }
});

export const { setChannels, setCurrentChannel } = channelSlice.actions;
export default channelSlice.reducer;
