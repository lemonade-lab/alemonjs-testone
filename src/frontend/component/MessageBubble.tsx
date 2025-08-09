import dayjs from 'dayjs';
import { Buffer } from 'buffer';
import { Button } from '@/frontend/ui/Button';
import { type DataEnums } from 'alemonjs';
import '@/frontend/component/MessageBubble.scss';
import { memo, useMemo, useCallback } from 'react';
import Zoom from 'antd/es/Image';

type MessageBubble = {
  data: DataEnums[];
  createAt: number;
  onSend: (value: string) => void;
  onInput: (value: string) => void;
};

type RendererFunction = (item: any, ...args: any[]) => React.ReactNode;

// 文本样式映射
const TEXT_STYLES: Record<
  string,
  (content: React.ReactNode) => React.ReactNode
> = {
  bold: content => <strong>{content}</strong>,
  italic: content => <em>{content}</em>,
  boldItalic: content => (
    <strong>
      <em>{content}</em>
    </strong>
  ),
  block: content => <div className="block">{content}</div>,
  strikethrough: content => <code>{content}</code>,
  none: content => content,
  default: content => content
};

// 提及类型映射
const MENTION_TYPES: Record<
  string,
  (value: string, userName?: string) => React.ReactNode
> = {
  all: () => <strong>@全体成员</strong>,
  everyone: () => <strong>@全体成员</strong>,
  全体成员: () => <strong>@全体成员</strong>,
  channel: value => <strong>#{value}</strong>,
  user: (value, userName) => <strong>@{userName || value}</strong>,
  guild: value => <strong>#{value}</strong>,
  default: () => <span></span>
};

// Markdown 组件映射
const MARKDOWN_RENDERERS: Record<string, (mdItem: any) => React.ReactNode> = {
  'MD.title': mdItem => <h1>{mdItem.value}</h1>,
  'MD.subtitle': mdItem => <h2>{mdItem.value}</h2>,
  'MD.blockquote': mdItem => <blockquote>{mdItem.value}</blockquote>,
  'MD.bold': mdItem => (
    <strong className="px-1 py-2 rounded-md shadow-inner">
      {mdItem.value}
    </strong>
  ),
  'MD.divider': () => <hr />,
  'MD.text': mdItem => <span>{mdItem.value}</span>,
  'MD.link': mdItem => (
    <a href={mdItem.value.url} target="_blank" rel="noopener noreferrer">
      {mdItem.value.text}
    </a>
  ),
  'MD.image': mdItem => {
    const w = mdItem.options?.width || '100';
    const h = mdItem.options?.height || '100';
    const url = mdItem.value;
    return url ? (
      <Zoom
        style={{ width: `${w}px`, height: `${h}px` }}
        className="max-w-[15rem] xl:max-w-[20rem] rounded-md"
        src={url}
        alt="Image"
      />
    ) : null;
  },
  'MD.italic': mdItem => <em>{mdItem.value}</em>,
  'MD.italicStar': mdItem => <em className="italic">{mdItem.value}</em>,
  'MD.strikethrough': mdItem => <s>{mdItem.value}</s>,
  'MD.newline': () => <br />,
  'MD.list': mdItem => {
    const listItem = mdItem.value;
    return (
      <div className="list-disc">
        {listItem.map((li: any, liIndex: number) => {
          if (typeof li.value === 'string') {
            return <li key={liIndex}>{li.value}</li>;
          }
          return (
            <div key={liIndex}>
              {li.value.index}.{li.value.text}
            </div>
          );
        })}
      </div>
    );
  },
  'MD.template': () => <div>暂时不支持MD.template</div>
};

// 不支持的组件映射
const UNSUPPORTED_COMPONENTS: Record<string, () => React.ReactNode> = {
  'MD.template': () => <div>暂时不支持</div>,
  'Ark.BigCard': () => <div>暂时不支持</div>,
  'Ark.Card': () => <div>暂时不支持</div>,
  'Ark.list': () => <div>暂时不支持</div>,
  'ImageFile': () => <div>暂时不支持file图片</div>
};

// 渲染图片组件
const renderImage = (item: any): React.ReactNode => {
  if (!item.value) return null;
  const data = Array.isArray(item.value)
    ? Buffer.from(item.value as any)
    : Buffer.from(item.value as string, 'base64');
  const base64String = data.toString('base64');
  const url = `data:image/png;base64,${base64String}`;
  return (
    <Zoom
      className="max-w-[15rem] xl:max-w-[20rem] rounded-md"
      src={url}
      alt="Image"
    />
  );
};

// 渲染URL图片组件
const renderImageURL = (item: any): React.ReactNode => {
  const url = item.value as string;
  return url ? (
    <Zoom
      className="max-w-[15rem] xl:max-w-[20rem] rounded-md"
      src={url}
      alt="ImageURL"
    />
  ) : null;
};

// 渲染文本组件
const renderText = (item: any): React.ReactNode => {
  const value = item.value as string;
  if (!value) return null;

  const textContent = value.includes('\n')
    ? value.split('\n').map((line: string, index: number) => (
        <span key={index}>
          {line}
          <br />
        </span>
      ))
    : value;

  const style = item.options?.style || 'default';
  const styleRenderer = TEXT_STYLES[style] || TEXT_STYLES.default;

  return <span>{styleRenderer(textContent)}</span>;
};

// 渲染提及组件
const renderMention = (item: any): React.ReactNode => {
  const value = item.value as string;

  // 检查特殊的全体成员提及
  if (value === 'all' || value === 'everyone' || value === '全体成员') {
    return (
      <span>{MENTION_TYPES[value]?.(value) || MENTION_TYPES.all(value)}</span>
    );
  }

  const belong = item.options?.belong || 'default';
  const userName = item.options?.payload?.name;
  const mentionRenderer = MENTION_TYPES[belong] || MENTION_TYPES.default;

  return <span>{mentionRenderer(value, userName)}</span>;
};

// 渲染按钮组组件
const renderButtonGroup = (
  item: any,
  onSend: (value: string) => void,
  onInput: (value: string) => void
): React.ReactNode => {
  if (item.options?.template_id) {
    return <div>暂时不支持BT template_id</div>;
  }

  const groups = item.value;
  if (!Array.isArray(groups)) {
    return <div>BT.group value is not an array</div>;
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.map((group: any, groupIdx: number) => {
        const bts = group.value;
        if (!Array.isArray(bts)) {
          return <div key={groupIdx}>BT.group value is not an array</div>;
        }

        return (
          <div key={groupIdx} className="flex flex-wrap gap-2">
            {bts.map((bt: any, btIdx: number) => {
              const value =
                typeof bt.value === 'string'
                  ? { label: bt.value, title: bt.value }
                  : bt.value;

              const autoEnter = bt.options?.autoEnter;
              const data =
                typeof bt.options?.data === 'string'
                  ? {
                      click: bt.options?.data,
                      confirm: bt.options?.data,
                      cancel: bt.options?.data
                    }
                  : bt.options?.data;

              return (
                <Button
                  key={btIdx}
                  onClick={() => {
                    if (autoEnter) {
                      onSend(data?.click || '');
                    } else {
                      onInput(data?.click || '');
                    }
                  }}
                >
                  {value.label}
                </Button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

// 渲染Markdown组件
const renderMarkdown = (item: any): React.ReactNode => {
  const markdown = item.value;
  if (!Array.isArray(markdown)) return null;

  return (
    <div className="mb-4">
      {markdown.map((mdItem: any, index: number) => {
        const renderer = MARKDOWN_RENDERERS[mdItem.type];
        return renderer ? <div key={index}>{renderer(mdItem)}</div> : null;
      })}
    </div>
  );
};

// 主要组件渲染器映射 - 使用 key-value 结构
const COMPONENT_RENDERERS: Record<string, RendererFunction> = {
  // 图片相关
  Image: renderImage,
  ImageURL: renderImageURL,

  // 文本相关
  Text: renderText,

  // 交互相关
  Mention: renderMention,
  Link: (item: any) => <div>{item.value}</div>,

  // 复杂组件
  Markdown: renderMarkdown,

  // 不支持的组件 - 展开不支持组件映射
  ...UNSUPPORTED_COMPONENTS
};

const MessageBubble = ({
  data,
  createAt,
  onSend = () => {},
  onInput = () => {}
}: MessageBubble) => {
  // 使用 useCallback 优化回调函数
  const handleSend = useCallback(
    (value: string) => {
      onSend(value);
    },
    [onSend]
  );

  const handleInput = useCallback(
    (value: string) => {
      onInput(value);
    },
    [onInput]
  );

  // 格式化时间戳
  const formattedTime = useMemo(() => {
    return dayjs(createAt).format('YYYY-MM-DD HH:mm:ss');
  }, [createAt]);

  // 渲染数据项 - 使用 key-value 映射优化
  const renderedItems = useMemo(() => {
    return data.map((item, index) => {
      // 从映射中获取渲染器
      const renderer = COMPONENT_RENDERERS[item.type];

      if (!renderer) {
        console.warn(`Unsupported component type: ${item.type}`);
        return null;
      }

      // 特殊处理需要回调函数的组件
      if (item.type === 'BT.group') {
        return (
          <div key={index}>
            {renderButtonGroup(item, handleSend, handleInput)}
          </div>
        );
      }

      // 其他组件只需要传入item参数
      return <div key={index}>{renderer(item)}</div>;
    });
  }, [data, handleSend, handleInput]);

  console.log('MessageBubble data');

  return (
    <div className="flex items-end">
      <div className="rounded-md py-1 flex relative px-2 shadow-md bg-[var(--panel-background)]">
        {renderedItems}
        <span className="absolute -bottom-3 whitespace-nowrap right-0 text-[0.5rem]">
          {formattedTime}
        </span>
      </div>
    </div>
  );
};

export default memo(MessageBubble);
