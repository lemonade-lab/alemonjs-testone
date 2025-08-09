import { Message } from '@/frontend/core/message';
import { useAppDispatch, useAppSelector } from '@/frontend/store';
import { setTab } from '@/frontend/store/slices/chatSlice';
import SyncOutlined from '@ant-design/icons/SyncOutlined';
import TagOutlined from '@ant-design/icons/TagOutlined';
import TagsOutlined from '@ant-design/icons/TagsOutlined';
import { useCallback } from 'react';

const Header = () => {
  // vscode 不需要 header
  if (window.vscode) {
    return <> </>;
  }
  const { tab } = useAppSelector(s => s.chat);
  const { connected: status } = useAppSelector(s => s.socket);
  const dispatch = useAppDispatch();
  const onGotab = useCallback(
    (t: typeof tab) => {
      if (t !== 'connect' && !status) {
        Message.info('请先连接服务器');
        return;
      }
      dispatch(setTab(t));
    },
    [status, dispatch]
  );
  return (
    <header className="flex justify-between border-b border-[--panel-border] p-4">
      <div>
        <div>ALemonTestOne</div>
      </div>
      <div className="flex gap-2 justify-end">
        <div className="cursor-pointer" onClick={() => onGotab?.('group')}>
          <TagsOutlined />
        </div>
        <div className="cursor-pointer" onClick={() => onGotab?.('private')}>
          <TagOutlined />
        </div>
        <div className="cursor-pointer" onClick={() => onGotab?.('connect')}>
          <SyncOutlined />
        </div>
      </div>
    </header>
  );
};

export default Header;
