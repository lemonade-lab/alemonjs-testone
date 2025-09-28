import * as vscode from 'vscode';
import { getWebviewContent } from './webview';
export const resolveWebviewView = (
  webview: vscode.Webview,
  context: vscode.ExtensionContext
) => {
  /**
   * 读文件
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
    /**
     * 显示信息
     */
    data.message && vscode.window.showInformationMessage(data.message);
    /**
     * 读文件
     */
    const dir = context.asAbsolutePath(data.payload.path);
    /**
     * 检查文件是否存在
     */
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
    /**
     * 读文件
     */
    try {
      const content = require('fs').readFileSync(dir, 'utf-8');
      // 读取返回字符串
      webview.postMessage({
        type: data.type,
        payload: {
          code: data.payload.code,
          data: content
        }
      });
    } catch (error) {
      console.error('读取文件失败:', error);
      webview.postMessage({
        type: data.type,
        payload: {
          code: data.payload.code,
          data: null
        }
      });
    }
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
    try {
      // 显示信息
      data.message && vscode.window.showInformationMessage(data.message);
      /**
       * 写文件
       */
      const dir = context.asAbsolutePath(data.payload.path);
      /**
       * 获取文件目录
       */
      const dirPath = require('path').dirname(dir);
      /**
       * 确保目录存在
       */
      if (!require('fs').existsSync(dirPath)) {
        require('fs').mkdirSync(dirPath, { recursive: true });
      }
      // 直接写入字符串
      require('fs').writeFileSync(dir, data.payload.data);
    } catch (error: any) {
      console.error('写入文件失败:', error);
      vscode.window.showErrorMessage(`写入文件失败: ${error.message}`);
    }
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
      // 存储前缀
      const prefix = 'dist/';
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
              path: `${prefix}${message.payload.path}`,
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
              path: `${prefix}${message.payload.path}`,
              data: message.payload.data
            }
          });
          break;
        }
        // 删除文件
        case 'fs.deleteFile': {
          const dir = context.asAbsolutePath(
            `${prefix}${message.payload.path}`
          );
          try {
            if (require('fs').existsSync(dir)) {
              require('fs').unlinkSync(dir);
              console.log('文件删除成功:', dir);
            }
          } catch (error: any) {
            console.error('删除文件失败:', error);
            vscode.window.showErrorMessage(`删除文件失败: ${error.message}`);
          }
          break;
        }
      }
    },
    undefined,
    context.subscriptions
  );

  webview.html = getWebviewContent(webview, context);
};
