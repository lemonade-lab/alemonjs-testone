import * as vscode from 'vscode';
export function getWebviewContent(
  webview: vscode.Webview,
  context: vscode.ExtensionContext
) {
  const scriptReg = /<script.*?src="(.+?)".*?>/g;
  const styleReg = /<link.*?href="(.+?)".*?>/g;
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(
      context.extensionUri,
      'dist-testone',
      'assets',
      'index.css'
    )
  );
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(
      context.extensionUri,
      'dist-testone',
      'assets',
      'index.js'
    )
  );
  const html = require('fs')
    .readFileSync(context.asAbsolutePath('dist-testone/index.html'), 'utf-8')
    .replace(
      '<head>',
      `<head> <script> window.vscode = acquireVsCodeApi(); </script>`
    )
    .replace(
      scriptReg,
      `<script type="module" crossorigin src="${scriptUri}"></script>`
    )
    .replace(
      styleReg,
      `<link rel="stylesheet" crossorigin href="${styleUri}">`
    );
  return html;
}
