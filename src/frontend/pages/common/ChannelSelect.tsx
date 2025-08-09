import { Channel } from '@/frontend/typing';
import { memo } from 'react';

const ChannelSelect = ({
  channels,
  onSelect
}: {
  channels: Channel[];
  onSelect: (channel: Channel) => void;
}) => {
  return (
    <div className="flex flex-row items-center">
      <select
        onChange={e => {
          const selectedChannel = channels.find(
            item => item.ChannelId === e.target.value
          );
          if (selectedChannel) {
            onSelect(selectedChannel);
          }
        }}
        className="px-2 py-1 rounded-md bg-[var(--input-background)] hover:bg-[var(--activityBar-background)] text-[var(--input-foreground)]"
      >
        {Array.isArray(channels) &&
          channels.map((item, index) => {
            return (
              <option key={index} value={item.ChannelId}>
                {item.ChannelId}
              </option>
            );
          })}
      </select>
    </div>
  );
};

export default memo(ChannelSelect);
