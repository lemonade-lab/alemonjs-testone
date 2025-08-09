import { useEffect } from 'react';
import { ACTIONS_MAP } from '../config';
import {
  PATH_CHAT_CODE,
  PATH_CHAT_PRIVATE_CODE,
  PATH_CONNECT_CODE
} from '../core/config';
import {
  setGroupMessages,
  setIsGroup,
  setPrivateMessages,
  setTab
} from '../store/slices/chatSlice';
import { useAppDispatch } from '../store';
import { Message } from '../core/message';
import { setConnects } from '../store/slices/connectSlice';

const useVSCode = () => {
  const dispatch = useAppDispatch();
  // VS Code 消息处理
  useEffect(() => {
    if (!window.vscode) {
      return;
    }
    /**
     *
     * @param code
     * @param data
     */
    const readFile = (code: number, data: any) => {
      try {
        switch (code) {
          case PATH_CONNECT_CODE: // 连接列表
            if (data && Array.isArray(data)) {
              if (data.length) {
                dispatch(setConnects(data));
              }
            }
            break;
          case PATH_CHAT_CODE: // 私聊消息
            dispatch(setPrivateMessages(data || []));
            break;
          case PATH_CHAT_PRIVATE_CODE: // 群聊消息
            dispatch(setGroupMessages(data || []));
            break;
          default: {
            console.warn('未知的文件代码:', code);
          }
        }
      } catch (error) {
        console.error('处理文件数据失败:', error);
      }
    };

    /**
     * 更新选项卡
     * @param type
     * @returns
     */
    const updateTab = (type: string) => {
      if (type !== 'ALemonTestOne.openConnect' && !status) {
        Message.info('请先连接服务器');
        return;
      }
      if (type === 'ALemonTestOne.openGroup') {
        dispatch(setIsGroup(true));
      } else if (type === 'ALemonTestOne.openPrivate') {
        dispatch(setIsGroup(false));
      }
      dispatch(setTab(ACTIONS_MAP[type]));
    };

    const handleResponse = (event: {
      data: { type: string; payload: any };
    }) => {
      if (!event.data.type) {
        return;
      }
      console.log('vscode 消息:', event.data);
      const message = event.data;
      try {
        if (ACTIONS_MAP[message.type]) {
          updateTab(message.type);
        } else if (message.type === 'fs.readFile') {
          readFile(message.payload.code, message.payload.data);
        }
      } catch (error) {
        console.error('处理 VS Code 消息失败:', error);
      }
    };
    window.addEventListener('message', handleResponse);
    return () => {
      window.removeEventListener('message', handleResponse);
    };
  }, []);
};

export default useVSCode;
