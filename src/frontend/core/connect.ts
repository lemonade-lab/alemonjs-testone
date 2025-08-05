import { Connect } from '@/frontend/typing';
export const LOCAL_STORAGE_KEY = 'ALemonTestOne:ConnectList';
export const PATH_CONNECT_CODE = 1001;
export const PATH_CONNECT_LIST = 'data/connect.json';
/**
 *
 * @returns
 */
export const getConnectList = (): Connect[] | null => {
  if (!window.vscode) {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  }
  // 读取连接配置列表
  vscode.postMessage({
    type: 'fs.readFile',
    payload: {
      code: PATH_CONNECT_CODE,
      path: PATH_CONNECT_LIST
    }
  });
  return null;
};
/**
 *
 * @param data
 * @param message
 * @returns
 */
export const saveConnect = (data: Connect[], message?: string) => {
  if (!window.vscode) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    return;
  }
  vscode.postMessage({
    type: 'fs.writeFile',
    message: message,
    payload: {
      code: PATH_CONNECT_CODE,
      path: PATH_CONNECT_LIST,
      data: data
    }
  });
};
