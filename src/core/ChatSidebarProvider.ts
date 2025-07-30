import * as vscode from 'vscode';
import { resolveWebviewView } from './resolveWebview';

export class ChatSidebarProvider implements vscode.WebviewViewProvider {
  /**
   *
   * @param context
   */
  constructor(private readonly context: vscode.ExtensionContext) {
    //
  }

  WebviewView: vscode.WebviewView | null = null;

  /**
   * @param webviewView
   */
  resolveWebviewView(webviewView: vscode.WebviewView) {
    this.WebviewView = webviewView;
    resolveWebviewView(webviewView.webview, this.context);
  }
}
