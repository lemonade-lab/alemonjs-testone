import React, { useEffect, useCallback } from 'react';

import ConnectList from '@/frontend/pages/ConnectList/App';
import ChatWindow from '@/frontend/pages/ChatWindow/App';
import HelpPage from '@/frontend/pages/HelpPage/App';
import ConfigEditor from '@/frontend/pages/ConfigEditor/App';
import Header from '@/frontend/pages/common/Header';
import { useAppDispatch, useAppSelector } from '@/frontend/store';
import { loadConnects } from '@/frontend/store/slices/connectSlice';
import { setTab } from '@/frontend/store/slices/chatSlice';
import {
  clearGroupMessages,
  clearPrivateMessages
} from '@/frontend/store/slices/chatSlice';
import useVSCode from '@/frontend/hook/useVSCode';
import Footer from './common/Footer';

export default function App() {
  const dispatch = useAppDispatch();
  const { tab } = useAppSelector(s => s.chat);
  const { lastConfig } = useAppSelector(s => s.socket);
  const { current: theme } = useAppSelector(s => s.theme);

  // VS Code 消息处理
  useVSCode();

  useEffect(() => {
    // 初始化连接列表
    dispatch(loadConnects());
  }, []);

  // 快捷键
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;

      switch (e.key) {
        case '1':
          e.preventDefault();
          dispatch(setTab('group'));
          break;
        case '2':
          e.preventDefault();
          dispatch(setTab('private'));
          break;
        case '3':
          e.preventDefault();
          dispatch(setTab('connect'));
          break;
        case '4':
          e.preventDefault();
          dispatch(setTab('help'));
          break;
        case 'k':
          // Cmd/Ctrl+K 清空当前聊天
          e.preventDefault();
          if (tab === 'group') dispatch(clearGroupMessages());
          else if (tab === 'private') dispatch(clearPrivateMessages());
          break;
      }
    },
    [dispatch, tab]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Tab 页面映射
  const tabMap: Record<typeof tab, React.ReactNode> = {
    connect: <ConnectList />,
    group: <ChatWindow pageType="public" />,
    private: <ChatWindow pageType="private" />,
    help: <HelpPage />,
    config: <ConfigEditor />
  };

  return (
    <div
      className="overflow-hidden flex flex-1 flex-col bg-[var(--sideBar-background)]"
      data-theme={theme}
    >
      <Header />
      {tabMap[tab]}
      <Footer>
        {tab !== 'connect' && lastConfig ? (
          <div>
            [{lastConfig.host}][{lastConfig.port}]
          </div>
        ) : (
          <div> </div>
        )}
      </Footer>
    </div>
  );
}
