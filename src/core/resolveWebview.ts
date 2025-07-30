import * as vscode from 'vscode';
import { getWebviewContent } from './webview';
export const resolveWebviewView = (
  webview: vscode.Webview,
  context: vscode.ExtensionContext
) => {
  /**
   * @param webviewView
   * @returns
   */
  const fsFreadFile = (
    webview: vscode.Webview,
    data: {
      type: string;
      message: string;
      payload: {
        code: string;
        path: string;
        data?: string | null;
      };
    }
  ) => {
    data.message && vscode.window.showInformationMessage(data.message);
    const dir = context.asAbsolutePath(data.payload.path);
    if (!require('fs').existsSync(dir)) {
      const dirPath = require('path').dirname(dir);
      require('fs').mkdirSync(dirPath, {
        recursive: true
      });
      webview.postMessage({
        type: data.type,
        payload: {
          code: data.payload.code,
          data: null
        }
      });
      return;
    }
    webview.postMessage({
      type: data.type,
      payload: {
        code: data.payload.code,
        data: JSON.parse(require('fs').readFileSync(dir, 'utf-8'))
      }
    });
  };

  /**
   *
   * @param webviewView
   * @param message
   */
  const fsWriteFile = (data: {
    type: string;
    message: string;
    payload: {
      code: string;
      path: string;
      data?: string | null;
    };
  }) => {
    const dir = context.asAbsolutePath(data.payload.path);
    require('fs').writeFileSync(dir, JSON.stringify(data.payload.data));
    data.message && vscode.window.showInformationMessage(data.message);
  };

  /**
   *
   */
  webview.options = {
    enableScripts: true,
    localResourceRoots: [
      vscode.Uri.joinPath(context.extensionUri),
      vscode.Uri.joinPath(context.extensionUri, 'dist-testone'),
      vscode.Uri.joinPath(context.extensionUri, 'dist-testone', 'assets')
    ]
  };

  // 监听webview发送的消息
  webview.onDidReceiveMessage(
    message => {
      switch (message.type) {
        // 显示通知
        case 'window.showInformationMessage': {
          vscode.window.showInformationMessage(message.payload.text);
          break;
        }
        // 读文件
        case 'fs.readFile': {
          fsFreadFile(webview, {
            type: 'fs.readFile',
            message: message.message,
            payload: {
              code: message.payload.code,
              path: `dist/${message.payload.path}`,
              data: null
            }
          });
          break;
        }
        // 写文件
        case 'fs.writeFile': {
          fsWriteFile({
            type: 'fs.writeFile',
            message: message.message,
            payload: {
              code: message.payload?.code,
              path: `dist/${message.payload.path}`,
              data: message.payload.data
            }
          });
          break;
        }
      }
    },
    undefined,
    context.subscriptions
  );

  webview.html = getWebviewContent(webview, context);
};
