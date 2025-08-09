import { message } from 'antd';

// 全局配置消息
message.config({
  prefixCls: 'testone-message'
});

// 消息提示
export const Message = {
  info: (text: string) => {
    if (!window.vscode) {
      message.info(text, 8);
      return;
    }
    window.vscode.postMessage({
      type: 'window.showInformationMessage',
      payload: {
        text: text
      }
    });
  },
  error: (text: string) => {
    if (!window.vscode) {
      message.error(text, 8);
      return;
    }
    window.vscode.postMessage({
      type: 'window.showInformationMessage',
      payload: {
        text: text
      }
    });
  },
  success: (text: string) => {
    if (!window.vscode) {
      message.success(text, 8);
      return;
    }
    window.vscode.postMessage({
      type: 'window.showInformationMessage',
      payload: {
        text: text
      }
    });
  }
};
