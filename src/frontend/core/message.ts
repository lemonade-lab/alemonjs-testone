// 消息提示
export const Message = {
  info: (message: string) => {
    if (!window.vscode) {
      alert(message);
      return;
    }
    window.vscode.postMessage({
      type: 'window.showInformationMessage',
      payload: {
        text: message
      }
    });
  }
};
