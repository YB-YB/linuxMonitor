import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMonitorStore } from '@/stores/monitor-store';
import { Activity, Cpu, MemoryStick } from 'lucide-react';
import { ProcessInfo } from '@/types/monitor';

export function ProcessTable() {
  const { data } = useMonitorStore();

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'running':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'sleeping':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'stopped':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'running':
        return '运行中';
      case 'sleeping':
        return '休眠';
      case 'stopped':
        return '已停止';
      default:
        return status;
    }
  };

  if (!data?.processes || !Array.isArray(data.processes) || data.processes.length === 0) {
    return (
      <Card className="bg-slate-800/90 backdrop-blur-sm border-slate-700">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-white flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Activity className="h-5 w-5 text-purple-400" />
            </div>
            系统进程
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-slate-400 py-8">
            暂无进程数据
          </div>
        </CardContent>
      </Card>
    );
  }

  // 过滤无效数据并按CPU使用率排序
  const validProcesses = data.processes.filter((p: ProcessInfo) => 
    p && typeof p === 'object' && p.pid !== undefined && p.name !== undefined
  );
  
  const sortedProcesses = [...validProcesses].sort((a, b) => 
    (isNaN(b.cpuPercent) ? 0 : b.cpuPercent) - (isNaN(a.cpuPercent) ? 0 : a.cpuPercent)
  );

  return (
    <Card className="bg-slate-800/90 backdrop-blur-sm border-slate-700 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-white flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Activity className="h-5 w-5 text-purple-400" />
          </div>
          系统进程
          <Badge variant="secondary" className="ml-auto bg-slate-700 text-slate-300">
            {validProcesses.length} 个进程
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden">
          {/* 表头 */}
          <div className="grid grid-cols-12 gap-4 pb-3 mb-4 border-b border-slate-700 text-sm font-medium text-slate-400">
            <div className="col-span-1">PID</div>
            <div className="col-span-4">进程名</div>
            <div className="col-span-2 flex items-center gap-1">
              <Cpu className="h-3 w-3" />
              CPU
            </div>
            <div className="col-span-2 flex items-center gap-1">
              <MemoryStick className="h-3 w-3" />
              内存
            </div>
            <div className="col-span-3">状态</div>
          </div>

          {/* 进程列表 */}
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {sortedProcesses.map((process) => {
              // 确保进程数据有效
              if (!process || typeof process !== 'object') return null;
              
              const cpuPercent = isNaN(process.cpuPercent) ? 0 : process.cpuPercent;
              const memoryPercent = isNaN(process.memoryPercent) ? 0 : process.memoryPercent;
              const status = process.status || 'unknown';
              
              return (
                <div 
                  key={process.pid || Math.random().toString()}
                  className="grid grid-cols-12 gap-4 py-3 px-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors text-sm"
                >
                  <div className="col-span-1 text-slate-300 font-mono">
                    {process.pid || '-'}
                  </div>
                  <div className="col-span-4 text-white font-medium truncate">
                    {process.name || '未知进程'}
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      <div className={`text-sm font-medium ${
                        cpuPercent > 50 ? 'text-red-400' :
                        cpuPercent > 20 ? 'text-yellow-400' :
                        'text-green-400'
                      }`}>
                        {cpuPercent.toFixed(1)}%
                      </div>
                      <div className="flex-1 bg-slate-600 rounded-full h-1.5">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            cpuPercent > 50 ? 'bg-red-400' :
                            cpuPercent > 20 ? 'bg-yellow-400' :
                            'bg-green-400'
                          }`}
                          style={{ width: `${Math.min(cpuPercent, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      <div className={`text-sm font-medium ${
                        memoryPercent > 10 ? 'text-red-400' :
                        memoryPercent > 5 ? 'text-yellow-400' :
                        'text-blue-400'
                      }`}>
                        {memoryPercent.toFixed(1)}%
                      </div>
                      <div className="flex-1 bg-slate-600 rounded-full h-1.5">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            memoryPercent > 10 ? 'bg-red-400' :
                            memoryPercent > 5 ? 'bg-yellow-400' :
                            'bg-blue-400'
                          }`}
                          style={{ width: `${Math.min(memoryPercent * 10, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="col-span-3">
                    <Badge 
                      variant="outline" 
                      className={`${getStatusColor(status)} text-xs`}
                    >
                      {getStatusText(status)}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}