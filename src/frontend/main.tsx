import '@ant-design/v5-patch-for-react-19';
import { createRoot } from 'react-dom/client';
import 'animate.css';
import '@/frontend/input.scss';
import App from '@/frontend/pages/App';
import ErrorBoundary from './ui/ErrorBoundary';
import { Provider } from 'react-redux';
import { store } from './store';

createRoot(document.getElementById('root')!).render(
  <Provider store={store}>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </Provider>
);

interface VsCodeApi {
  postMessage<T = any>(message: T): void; // 发送消息到插件
  setState<T = any>(newState: T): T; // 存储状态
  getState<T = any>(): T | undefined; // 获取存储的状态
}

declare global {
  var socket: WebSocket;
  var vscode: VsCodeApi;
  interface Window {
    websocket: WebSocket | null;
  }
}
