import { Monitor, Wifi, WifiOff } from 'lucide-react';
import { useMonitorStore } from '@/stores/monitor-store';
import { formatUptime } from '@/utils/format';

export function Header() {
  const { data, isConnected } = useMonitorStore();

  return (
    <header className="bg-slate-900 border-b border-slate-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Monitor className="h-8 w-8 text-blue-400" />
          <div>
            <h1 className="text-xl font-bold text-white">Linux系统监控</h1>
            <p className="text-sm text-slate-400">
              {data?.system.hostname || '连接中...'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <Wifi className="h-5 w-5 text-green-400" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-400" />
            )}
            <span className={`text-sm ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
              {isConnected ? 'API连接正常' : 'API连接断开'}
            </span>
          </div>

          {data?.system.uptime && (
            <div className="text-sm text-slate-300">
              <span className="text-slate-400">运行时间: </span>
              {formatUptime(data.system.uptime)}
            </div>
          )}

          <div className="text-sm text-slate-300">
            {new Date().toLocaleTimeString('zh-CN')}
          </div>
        </div>
      </div>
    </header>
  );
}