import * as flattedJSON from 'flatted';
import {
  LOCAL_STORAGE_KEY,
  PATH_CHAT_CODE,
  PATH_CHAT_PRIVATE_CODE,
  PATH_CHATS
} from './config';

/**
 * @param type
 * @param chatId
 * @returns
 */
export const getChatListKey = (
  host: string,
  port: number,
  type: 'public' | 'private',
  chatId: string
) => {
  return `${LOCAL_STORAGE_KEY}:${host}:${port}:${type}:${chatId}`;
};

// 读取聊天记录
export const getChatList = (
  host: string,
  port: number,
  type: 'public' | 'private',
  chatId: string
) => {
  if (!window.vscode) {
    const key = getChatListKey(host, port, type, chatId);
    const data = localStorage.getItem(key);
    try {
      return data ? flattedJSON.parse(data) : null;
    } catch (error) {
      console.error('Error parsing chat list:', error);
      return null;
    }
  }
  // 读取连接配置列表
  vscode.postMessage({
    type: 'fs.readFile',
    payload: {
      type: type === 'public' ? PATH_CHAT_CODE : PATH_CHAT_PRIVATE_CODE,
      path: `${PATH_CHATS}/${type}/${chatId}.json`
    }
  });
};

export const saveChatList = (
  host: string,
  port: number,
  type: 'public' | 'private',
  chatId: string,
  data: any
) => {
  if (!window.vscode) {
    const key = getChatListKey(host, port, type, chatId);
    try {
      // 计算大小
      const d = flattedJSON.stringify(data);
      const size = new Blob([d]).size;
      // 计算大小
      const max = 5 * 1024 * 1024; // 5MB
      if (size > max) {
        // 超限制。把最后一半的数据丢去掉
        localStorage.setItem(
          key,
          flattedJSON.stringify(data.slice(0, Math.floor(data.length / 2)))
        );
        return;
      }
      localStorage.setItem(key, d);
    } catch (error) {
      console.error('Error saving chat list:', error);
      return;
    }
    return;
  }
  vscode.postMessage({
    type: 'fs.writeFile',
    payload: {
      code: type === 'public' ? PATH_CHAT_CODE : PATH_CHAT_PRIVATE_CODE,
      path: `${PATH_CHATS}/${type}/${chatId}.json`,
      data: flattedJSON.stringify(data)
    }
  });
};

export const delChatList = (
  host: string,
  port: number,
  type: 'public' | 'private',
  chatId: string
) => {
  if (!window.vscode) {
    const key = getChatListKey(host, port, type, chatId);
    localStorage.removeItem(key);
    return;
  }
  vscode.postMessage({
    type: 'fs.deleteFile',
    payload: {
      path: `${PATH_CHATS}/${type}/${chatId}.json`
    }
  });
};
