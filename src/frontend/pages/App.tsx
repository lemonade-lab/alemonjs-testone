import React, { useEffect } from 'react';

import ConnectList from '@/frontend/pages/ConnectList/App';
import ChatWindow from '@/frontend/pages/ChatWindow/App';
import Header from '@/frontend/pages/common/Header';
import { useAppDispatch, useAppSelector } from '@/frontend/store';
import { loadConnects } from '@/frontend/store/slices/connectSlice';
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

  // Tab 页面映射
  const tabMap: Record<typeof tab, React.ReactNode> = {
    connect: <ConnectList />,
    group: <ChatWindow pageType="public" />,
    private: <ChatWindow pageType="private" />
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
