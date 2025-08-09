import { createAsyncThunk } from '@reduxjs/toolkit';
import { useUserHashKey, Platform } from '../core/alemon';
import type { DataEnums } from 'alemonjs';
import { appendGroupMessage, appendPrivateMessage } from './slices/chatSlice';
import { RootState, safeSend } from './index';
import { Channel, User } from '../typing';

export const sendGroupFormat = createAsyncThunk<
  void,
  {
    currentChannel: Channel;
    content: DataEnums[];
  },
  { state: RootState }
>(
  'chat/sendGroupFormat',
  async ({ currentChannel, content }, { getState, dispatch }) => {
    const state = getState();
    const { current: currentUser } = {
      current: state.users.current
    };
    const { channel } = {
      channel: state.channels.current
    };
    if (!currentUser || !channel) {
      return;
    }
    const UserKey = useUserHashKey({
      Platform,
      UserId: currentUser.UserId
    });
    const MessageText = content.find(i => i.type === 'Text')?.value || '';
    const payload = {
      name: 'message.create',
      ChannelId: currentChannel.ChannelId,
      GuildId: currentChannel.ChannelId,
      UserId: currentUser.UserId,
      OpenId: currentUser.OpenId || '',
      UserName: currentUser.UserName,
      UserKey,
      IsBot: false,
      IsMaster: false,
      UserAvatar: currentUser.UserAvatar,
      Platform,
      MessageText,
      CreateAt: Date.now(),
      MessageId: Date.now().toString(),
      tag: currentChannel.ChannelId,
      value: content
    };

    // 如果目标频道 和 当前频道不同。则不进行状态更新
    if (currentChannel.ChannelId === channel.ChannelId) {
      dispatch(
        appendGroupMessage({
          UserId: currentUser.UserId,
          UserName: currentUser.UserName,
          UserAvatar: currentUser.UserAvatar,
          CreateAt: payload.CreateAt,
          data: content
        })
      );
    }

    safeSend(payload);
  }
);

export const sendPrivateFormat = createAsyncThunk<
  void,
  {
    currentUser: User;
    content: DataEnums[];
  },
  { state: RootState }
>('chat/sendPrivateFormat', async ({ currentUser, content }, { dispatch }) => {
  if (!currentUser) {
    return;
  }
  const UserKey = useUserHashKey({
    Platform,
    UserId: currentUser.UserId
  });
  const MessageText = content.find(i => i.type === 'Text')?.value || '';
  const payload = {
    name: 'private.message.create',
    UserId: currentUser.UserId,
    UserKey,
    OpenId: currentUser.OpenId || '',
    IsBot: false,
    IsMaster: false,
    UserAvatar: currentUser.UserAvatar,
    Platform,
    MessageText,
    CreateAt: Date.now(),
    MessageId: Date.now().toString(),
    UserName: currentUser.UserName,
    tag: 'bot',
    value: content
  };
  dispatch(
    appendPrivateMessage({
      UserId: currentUser.UserId,
      UserName: currentUser.UserName,
      UserAvatar: currentUser.UserAvatar,
      CreateAt: payload.CreateAt,
      data: content
    })
  );
  safeSend(payload);
});
