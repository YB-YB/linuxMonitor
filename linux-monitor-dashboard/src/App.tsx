import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { OverviewCard } from '@/components/cards/overview-card';
import { EnhancedCpuChart } from '@/components/charts/enhanced-cpu-chart';
import { MemoryChart } from '@/components/charts/memory-chart';
import { NetworkChart } from '@/components/charts/network-chart';
import { DiskChart } from '@/components/charts/disk-chart';
import { ProcessTable } from '@/components/process-table';
import { NetworkDetails } from '@/components/network-details';
import { useMonitorStore } from '@/stores/monitor-store';
import { Cpu, MemoryStick, HardDrive, Network } from 'lucide-react';
import { formatBytes } from '@/utils/format';
import { GlobalErrorBoundary } from '@/components/global-error-boundary';
import { ErrorBoundary, withErrorBoundary } from '@/components/error-boundary';

// 使用错误边界包装图表组件
const SafeEnhancedCpuChart = withErrorBoundary(EnhancedCpuChart, { componentName: 'CPU图表' });
const SafeMemoryChart = withErrorBoundary(MemoryChart, { componentName: '内存图表' });
const SafeDiskChart = withErrorBoundary(DiskChart, { componentName: '磁盘图表' });
const SafeNetworkChart = withErrorBoundary(NetworkChart, { componentName: '网络图表' });
const SafeProcessTable = withErrorBoundary(ProcessTable, { componentName: '进程表格' });
const SafeNetworkDetails = withErrorBoundary(NetworkDetails, { componentName: '网络详情' });

function App() {
  const { 
    data, 
    isConnected, 
    isLoading, 
    error, 
    initializeConnection, 
    disconnect, 
    retryConnection,
    connectionType,
    switchConnectionType
  } = useMonitorStore();
  
  // 添加重试计数器和超时状态
  const [retryCount, setRetryCount] = useState(0);
  const [isTimeout, setIsTimeout] = useState(false);
  
  // 处理重试逻辑
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setIsTimeout(false);
    retryConnection();
  };
  
  // 切换连接类型
  const handleSwitchConnection = () => {
    const newType = connectionType === 'websocket' ? 'http' : 'websocket';
    switchConnectionType(newType);
    setRetryCount(prev => prev + 1);
    setIsTimeout(false);
  };

  // 初始化连接 - 只在组件挂载时执行一次
  useEffect(() => {
    console.log('正在初始化连接...');
    console.log('当前连接类型:', connectionType);
    
    // 初始化连接
    initializeConnection();

    // 定期检查连接状态，但不主动触发重连
    // 这样可以避免频繁重新渲染整个页面
    const checkInterval = setInterval(() => {
      // 只记录状态，不触发操作
      console.log('连接状态检查:', isConnected ? '已连接' : '未连接');
    }, 30000); // 增加检查间隔到30秒

    // 清理函数
    return () => {
      console.log('组件卸载，停止连接');
      clearInterval(checkInterval);
      disconnect();
    };
  }, []); // 空依赖数组，确保只在组件挂载时执行一次
  
  // 设置连接超时 - 单独的useEffect
  useEffect(() => {
    if (isLoading) {
      const timeoutId = setTimeout(() => {
        if (isLoading) {
          setIsTimeout(true);
        }
      }, 10000); // 10秒超时
      
      return () => clearTimeout(timeoutId);
    }
  }, [isLoading]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-red-400 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">连接错误</h1>
          <p className="text-slate-400 mb-4">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button 
              onClick={handleRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              重新连接
            </button>
            <button 
              onClick={handleSwitchConnection}
              className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-700 transition-colors"
            >
              切换到{connectionType === 'websocket' ? 'HTTP' : 'WebSocket'}连接
            </button>
          </div>
          <div className="mt-4 text-xs text-slate-500">
            当前连接类型: {connectionType === 'websocket' ? 'WebSocket' : 'HTTP API'}
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          {isTimeout ? (
            <>
              <div className="text-yellow-400 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">连接超时</h2>
              <p className="text-slate-400 mb-4">连接监控服务时间过长，可能是服务器响应缓慢或网络问题</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button 
                  onClick={handleRetry}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  重试连接
                </button>
                <button 
                  onClick={handleSwitchConnection}
                  className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-700 transition-colors"
                >
                  切换到{connectionType === 'websocket' ? 'HTTP' : 'WebSocket'}连接
                </button>
              </div>
              <div className="mt-4 text-xs text-slate-500">
                当前连接类型: {connectionType === 'websocket' ? 'WebSocket' : 'HTTP API'}
              </div>
            </>
          ) : (
            <>
              <div className="relative mx-auto mb-6">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
                <div className="absolute inset-0 flex items-center justify-center text-blue-400 text-sm font-medium">
                  {retryCount > 0 ? `#${retryCount}` : ''}
                </div>
              </div>
              <p className="text-slate-300 text-lg font-medium mb-2">正在连接监控服务...</p>
              <p className="text-slate-400 mb-4">首次加载可能需要几秒钟时间</p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-center space-x-2 text-sm">
                  <span className={`inline-block w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></span>
                  <span className="text-slate-500">连接状态: {isConnected ? '已连接' : '未连接'}</span>
                </div>
                <div className="text-xs text-slate-500">
                  连接类型: {connectionType === 'websocket' ? 'WebSocket' : 'HTTP API'}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <GlobalErrorBoundary>
      <div className="min-h-screen bg-gradient-dark">
        <Header />
        
        <main className="container mx-auto px-6 py-6">
        {/* 连接状态指示器 */}
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${
              isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-400' : 'bg-red-400'
              }`}></div>
              <span className="text-sm">{isConnected ? '连接正常' : '连接断开'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-slate-400 text-sm">
                主机: {data.system?.hostname || '加载中...'}
              </span>
              <span className="text-xs text-slate-500 px-2 py-0.5 bg-slate-800 rounded-full">
                {connectionType === 'websocket' ? 'WebSocket' : 'HTTP'}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-slate-400 text-sm">
              最后更新: {data.system?.timestamp ? new Date(data.system.timestamp).toLocaleTimeString() : '加载中...'}
            </div>
            <button 
              onClick={handleSwitchConnection}
              className="text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition-colors"
            >
              切换到{connectionType === 'websocket' ? 'HTTP' : 'WebSocket'}
            </button>
          </div>
        </div>

        {/* 系统概览卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <OverviewCard
            title="CPU使用率"
            value={data.cpu ? `${data.cpu.usage.toFixed(1)}%` : '加载中...'}
            percentage={data.cpu?.usage || 0}
            icon={Cpu}
            isLoading={!data.cpu}
          />
          <OverviewCard
            title="内存使用率"
            value={data.memory ? `${formatBytes(data.memory.used)}` : '加载中...'}
            percentage={data.memory?.percent || 0}
            icon={MemoryStick}
            isLoading={!data.memory}
          />
          <OverviewCard
            title="磁盘使用率"
            value={data.disk ? `${formatBytes(data.disk.used)}` : '加载中...'}
            percentage={data.disk?.percent || 0}
            icon={HardDrive}
            isLoading={!data.disk}
          />
          <OverviewCard
            title="网络连接"
            value={data.network?.connections ? `${data.network.connections.tcp + data.network.connections.udp}` : '加载中...'}
            percentage={data.network?.connections ? Math.min(((data.network.connections.tcp + data.network.connections.udp) / 10), 100) : 0}
            icon={Network}
            isLoading={!data.network}
          />
        </div>

        {/* 监控图表 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <SafeEnhancedCpuChart />
          <SafeMemoryChart />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <SafeDiskChart />
          <SafeNetworkChart />
        </div>

        {/* 进程管理 - 只有当进程数据可用时才显示 */}
        {data.processes && (
          <div className="grid grid-cols-1 gap-6 mb-8">
            <SafeProcessTable />
          </div>
        )}

        {/* 网络详细信息 - 只有当网络数据可用时才显示 */}
        {data.network && (
          <div className="grid grid-cols-1 gap-6 mb-8">
            <SafeNetworkDetails />
          </div>
        )}

        {/* 系统信息面板 */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {data.system && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">系统信息</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">主机名:</span>
                  <span className="text-white">{data.system.hostname}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">平台:</span>
                  <span className="text-white">{data.system.platform}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">运行时间:</span>
                  <span className="text-white">{Math.floor(data.system.uptime / 3600)}小时</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">负载平均:</span>
                  <span className="text-white">{data.system.loadAverage.map(l => l.toFixed(2)).join(', ')}</span>
                </div>
              </div>
            </div>
          )}

          {data.cpu && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">CPU详情</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">核心数:</span>
                  <span className="text-white">{data.cpu.cores.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">频率:</span>
                  <span className="text-white">{data.cpu.frequency} MHz</span>
                </div>
                {data.cpu.temperature && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">温度:</span>
                    <span className="text-white">{data.cpu.temperature.toFixed(1)}°C</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">使用率:</span>
                  <span className="text-white">{data.cpu.usage.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          )}

          {data.network && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">网络统计</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">总发送:</span>
                  <span className="text-white">{formatBytes(data.network.totalSent)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">总接收:</span>
                  <span className="text-white">{formatBytes(data.network.totalReceived)}</span>
                </div>
                {data.network.connections && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-400">TCP连接:</span>
                      <span className="text-white">{data.network.connections.tcp}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">UDP连接:</span>
                      <span className="text-white">{data.network.connections.udp}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        </main>
      </div>
    </GlobalErrorBoundary>
  );
}

export default App;