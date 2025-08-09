import StopOutlined from '@ant-design/icons/StopOutlined';
import CloseCircleOutlined from '@ant-design/icons/CloseCircleOutlined';
import FieldTimeOutlined from '@ant-design/icons/FieldTimeOutlined';

const TimerManager = ({
  running,
  commandTasksInfo,
  onDel,
  addTask,
  stopAllCommandTasks
}: {
  running: number;
  commandTasksInfo: any[];
  onDel: (task: any) => void;
  addTask: () => void;
  stopAllCommandTasks: () => void;
}) => {
  return (
    <div className="mb-2 p-2 bg-green-200 dark:bg-green-900 rounded text-xs">
      <div className="flex justify-between">
        <div className="font-semibold text-green-800 dark:text-green-200">
          运行中的任务 ({running})
        </div>
        <div className="flex gap-2">
          <FieldTimeOutlined onClick={addTask} />
          <CloseCircleOutlined onClick={stopAllCommandTasks} />
        </div>
      </div>
      {commandTasksInfo
        .filter(task => task.isRunning)
        .map(task => (
          <div
            key={task.id}
            className="mt-1 text-green-700 dark:text-green-300"
          >
            <div className="flex items-center">
              <div>📋 {task.name}</div>
            </div>
            <div>🔄 已执行: {task.executionCount} 次</div>

            <div className="flex items-center justify-between">
              <div className="flex">
                {task.metadata && (
                  <div>⏱️ 频率: {task.metadata.frequency}秒</div>
                )}
              </div>

              <div
                className="ml-auto cursor-pointer"
                onClick={() => {
                  console.log('Deleting onDelete:', onDel);
                  onDel && onDel(task);
                }}
              >
                <CloseCircleOutlined />
              </div>
            </div>
          </div>
        ))}
    </div>
  );
};

export default TimerManager;
