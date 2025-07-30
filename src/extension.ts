import * as vscode from 'vscode';
import { ChatSidebarProvider } from './core/ChatSidebarProvider';
import { resolveWebviewView } from './core/resolveWebview';

export function activate(context: vscode.ExtensionContext) {
  const Sidebar = new ChatSidebarProvider(context);

  const commands = [
    'ALemonTestOne.openGroup',
    'ALemonTestOne.openPrivate',
    'ALemonTestOne.openConnect'
  ];

  for (const command of commands) {
    context.subscriptions.push(
      vscode.commands.registerCommand(command, async () => {
        if (Sidebar.WebviewView) {
          Sidebar.WebviewView.show();
          try {
            Sidebar.WebviewView.webview.postMessage({
              type: command,
              payload: {}
            });
          } catch (e) {
            console.log(e);
          }
        }
      })
    );
  }

  const command = {
    openSidebar: 'ALemonTestOne.openSidebar',
    openPanel: 'ALemonTestOne.openPanel'
  };

  const provider = {
    chatSidebar: 'ALemonTestOne.chatSidebar'
  };

  /**
   * open sidebar chat
   */
  const chatSidebar = vscode.window.registerWebviewViewProvider(
    provider.chatSidebar,
    Sidebar
  );
  context.subscriptions.push(chatSidebar);
  const openSidebar = vscode.commands.registerCommand(
    command.openSidebar,
    async () => {
      await vscode.commands.executeCommand(`${provider.chatSidebar}.focus`);
    }
  );
  context.subscriptions.push(openSidebar);

  /**
   * button to open chat window
   */
  const openChatWindowButton = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  openChatWindowButton.text = '$(comment-discussion) A';
  openChatWindowButton.command = command.openSidebar;
  openChatWindowButton.show();
  context.subscriptions.push(openChatWindowButton);

  /**
   * open new chat
   */
  let panel: vscode.WebviewPanel | undefined = undefined;
  const createPanel = (viewColumn: vscode.ViewColumn) => {
    if (panel) {
      if (panel.visible) {
        panel.reveal(viewColumn);
        return;
      }
      panel.dispose();
    }
    panel = vscode.window.createWebviewPanel(
      'chat',
      'A ' + viewColumn,
      viewColumn,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );
    resolveWebviewView(panel.webview, context);
    panel.onDidDispose(() => {
      panel = undefined;
    });
  };
  const openPanel = vscode.commands.registerCommand(command.openPanel, () => {
    createPanel(vscode.ViewColumn.Two);
  });
  context.subscriptions.push(openPanel);
}
