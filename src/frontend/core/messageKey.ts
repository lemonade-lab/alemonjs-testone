import { MessageItem } from '@/frontend/typing';
export function buildMessageKey(m: MessageItem): string {
  return `${m.CreateAt}-${m.UserId || 'sys'}`;
}
