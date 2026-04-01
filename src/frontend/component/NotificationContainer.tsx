import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/frontend/store';
import { removeNotification } from '@/frontend/store/slices/notificationSlice';
import { SystemNotification } from '@/frontend/store/slices/notificationSlice';

/**
 * 单条通知项
 */
function NotificationItem({
  notification,
  onClose
}: {
  notification: SystemNotification;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!notification.duration || notification.duration <= 0) {
      return;
    }
    const timer = setTimeout(onClose, notification.duration);
    return () => clearTimeout(timer);
  }, [notification.duration, onClose]);

  const typeColors: Record<string, string> = {
    notice: 'bg-blue-500 border-blue-600',
    member_change: 'bg-purple-500 border-purple-600',
    channel_change: 'bg-green-500 border-green-600',
    guild_change: 'bg-orange-500 border-orange-600'
  };

  const typeIcons: Record<string, string> = {
    notice: '📢',
    member_change: '👥',
    channel_change: '#️⃣',
    guild_change: '🏘️'
  };

  return (
    <div
      className={`${typeColors[notification.type] || 'bg-gray-500'} text-white px-4 py-3 rounded-md shadow-lg border-l-4 flex items-start gap-3 animate-slideIn max-w-md`}
    >
      <span className="text-xl flex-shrink-0">
        {typeIcons[notification.type] || '📝'}
      </span>
      <div className="flex-1">
        <div className="font-bold text-sm">{notification.title}</div>
        <div className="text-xs mt-1 opacity-90">{notification.content}</div>
      </div>
      <button
        onClick={onClose}
        className="text-xl cursor-pointer hover:opacity-75 flex-shrink-0 leading-none"
      >
        ×
      </button>
    </div>
  );
}

/**
 * 通知容器 - 在应用顶部显示系统通知
 */
export default function NotificationContainer() {
  const dispatch = useAppDispatch();
  const notifications = useAppSelector(s => s.notification.notifications);

  const handleRemove = (id: string) => {
    dispatch(removeNotification(id));
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-40 flex flex-col gap-2 pointer-events-none">
      {notifications.map(notification => (
        <div key={notification.id} className="pointer-events-auto">
          <NotificationItem
            notification={notification}
            onClose={() => handleRemove(notification.id)}
          />
        </div>
      ))}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
