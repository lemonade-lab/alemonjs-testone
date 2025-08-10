import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/frontend/store';
import { setTab } from '@/frontend/store/slices/chatSlice';
import { Message } from '@/frontend/core/message';
import { toggleTheme } from '@/frontend/store/slices/themeSlice';
import { setAutoConnectEnabled } from '@/frontend/store/slices/socketSlice';

import SyncOutlined from '@ant-design/icons/SyncOutlined';
import TagOutlined from '@ant-design/icons/TagOutlined';
import TagsOutlined from '@ant-design/icons/TagsOutlined';
import BulbOutlined from '@ant-design/icons/BulbOutlined';
import ThunderboltOutlined from '@ant-design/icons/ThunderboltOutlined';
import { Tooltip } from '@/frontend/ui/Tooltip';

interface NavActionsProps {
  autoTooltipPlacement?:
    | 'top'
    | 'bottom'
    | 'left'
    | 'right'
    | 'topright'
    | 'topleft'
    | 'bottomright'
    | 'bottomleft';
  className?: string;
}

export const NavActions = ({
  autoTooltipPlacement = 'top',
  className
}: NavActionsProps) => {
  const dispatch = useAppDispatch();
  const { tab } = useAppSelector(s => s.chat);
  const { connected: status, autoConnectEnabled } = useAppSelector(
    s => s.socket
  );
  const { current: theme } = useAppSelector(s => s.theme);

  const onGotab = useCallback(
    (t: typeof tab) => {
      if (t !== 'connect' && !status) {
        Message.info('请先连接服务器');
        return;
      }
      dispatch(setTab(t));
    },
    [status, dispatch, tab]
  );

  const vt = (txt: string) => (
    <span
      style={{
        writingMode: 'vertical-rl',
        textOrientation: 'upright',
        lineHeight: 1.2,
        display: 'inline-block'
      }}
    >
      {txt}
    </span>
  );

  return (
    <div className={'flex gap-3 justify-end items-center ' + (className || '')}>
      <Tooltip
        placement={autoTooltipPlacement}
        content={vt(autoConnectEnabled ? '自连开' : '自连关')}
        portal
      >
        <div
          className="w-6 h-6 flex items-center justify-center cursor-pointer"
          onClick={() => dispatch(setAutoConnectEnabled(!autoConnectEnabled))}
        >
          <div
            className={
              'size-3 rounded-full border transition-colors ' +
              (autoConnectEnabled
                ? 'bg-green-500 border-green-500'
                : 'bg-gray-400 border-gray-400')
            }
          />
        </div>
      </Tooltip>
      <Tooltip
        placement={autoTooltipPlacement}
        content={vt(theme === 'web3' ? '新主题' : '默认主题')}
        portal
      >
        <div className="cursor-pointer" onClick={() => dispatch(toggleTheme())}>
          {theme === 'web3' ? <BulbOutlined /> : <ThunderboltOutlined />}
        </div>
      </Tooltip>
      <Tooltip placement={autoTooltipPlacement} content={vt('群聊')} portal>
        <div className="cursor-pointer" onClick={() => onGotab('group')}>
          <TagsOutlined />
        </div>
      </Tooltip>
      <Tooltip placement={autoTooltipPlacement} content={vt('私聊')} portal>
        <div className="cursor-pointer" onClick={() => onGotab('private')}>
          <TagOutlined />
        </div>
      </Tooltip>
      <Tooltip placement={autoTooltipPlacement} content={vt('连接')} portal>
        <div className="cursor-pointer" onClick={() => onGotab('connect')}>
          <SyncOutlined />
        </div>
      </Tooltip>
    </div>
  );
};

export default NavActions;
