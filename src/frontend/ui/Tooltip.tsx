import React, { useState, ReactNode } from 'react';
import classNames from 'classnames';

interface TooltipProps {
  content: ReactNode;
  children: React.ReactElement;
  placement?:
    | 'top'
    | 'bottom'
    | 'left'
    | 'right'
    | 'topright'
    | 'topleft'
    | 'bottomright'
    | 'bottomleft';
  rootClassName?: string;
  className?: string;
}

const placementStyle: Record<string, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  topright: 'bottom-full left-full mb-2 ml-2',
  topleft: 'bottom-full right-full mb-2 mr-2',
  bottomright: 'top-full left-full mt-2 ml-2',
  bottomleft: 'top-full right-full mt-2 mr-2'
};

export function Tooltip({
  content,
  children,
  placement = 'top',
  rootClassName,
  className
}: TooltipProps) {
  const [visible, setVisible] = useState(false);

  // 克隆子元素，添加事件
  const child = React.cloneElement(children, {
    onMouseEnter: () => setVisible(true),
    onMouseLeave: () => setVisible(false),
    ...children.props
  });

  return (
    <div className={classNames('relative inline-block', rootClassName)}>
      {child}
      {visible && (
        <div
          className={classNames(
            'absolute z-10 px-2 py-1 text-sm rounded shadow-lg border',
            'bg-[var(--editorWidget-background)]',
            'text-[var(--editorWidget-foreground)]',
            'border-[var(--editorWidget-border)]',
            'max-w-xs break-words whitespace-normal', // 修复竖立问题
            placementStyle[placement],
            className
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
