import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { useMonitorStore } from '@/stores/monitor-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Network } from 'lucide-react';
import { formatSpeed, formatBytes } from '@/utils/format';
import { NetworkInfo } from '@/types/monitor';

// 内联定义历史数据类型
interface HistoryItem {
  timestamp: number;
}

interface NetworkHistoryItem extends HistoryItem {
  uploadSpeed: number;
  downloadSpeed: number;
}

export function NetworkChart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const { networkHistory, data } = useMonitorStore();

  useEffect(() => {
    if (!chartRef.current) return;

    chartInstance.current = echarts.init(chartRef.current, 'dark');

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: [],
        axisLine: {
          lineStyle: {
            color: '#475569'
          }
        },
        axisLabel: {
          color: '#94a3b8'
        }
      },
      yAxis: {
        type: 'value',
        axisLine: {
          lineStyle: {
            color: '#475569'
          }
        },
        axisLabel: {
          color: '#94a3b8',
          formatter: (value: number) => {
            if (value >= 1024 * 1024) {
              return (value / (1024 * 1024)).toFixed(1) + 'MB/s';
            } else if (value >= 1024) {
              return (value / 1024).toFixed(1) + 'KB/s';
            }
            return value + 'B/s';
          }
        },
        splitLine: {
          lineStyle: {
            color: '#334155'
          }
        }
      },
      series: [
        {
          name: '上传速度',
          type: 'line',
          smooth: true,
          symbol: 'none',
          lineStyle: {
            color: '#f59e0b',
            width: 2
          },
          data: []
        },
        {
          name: '下载速度',
          type: 'line',
          smooth: true,
          symbol: 'none',
          lineStyle: {
            color: '#8b5cf6',
            width: 2
          },
          data: []
        }
      ],
      legend: {
        data: ['上传速度', '下载速度'],
        textStyle: {
          color: '#94a3b8'
        }
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1e293b',
        borderColor: '#475569',
        textStyle: {
          color: '#f1f5f9'
        },
        formatter: (params: any) => {
          let result = `${params[0].name}<br/>`;
          params.forEach((param: any) => {
            result += `${param.seriesName}: ${formatSpeed(param.value)}<br/>`;
          });
          return result;
        }
      }
    };

    chartInstance.current.setOption(option);

    const handleResize = () => {
      chartInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (!chartInstance.current) return;
    if (!networkHistory || !Array.isArray(networkHistory) || networkHistory.length === 0) return;

    try {
      // 确保数据有效性
      const validHistory = networkHistory.filter(item => 
        item && typeof item === 'object' && item.timestamp !== undefined
      );
      
      if (validHistory.length === 0) return;

      const times = validHistory.map(item => {
        try {
          return new Date(item.timestamp).toLocaleTimeString('zh-CN', { 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
        } catch (e) {
          return '无效时间';
        }
      });
      
      const uploadSpeeds = validHistory.map(item => {
        return item.uploadSpeed !== undefined ? item.uploadSpeed : 0;
      });
      
      const downloadSpeeds = validHistory.map(item => {
        return item.downloadSpeed !== undefined ? item.downloadSpeed : 0;
      });

      chartInstance.current.setOption({
        xAxis: {
          data: times
        },
        series: [
          {
            data: uploadSpeeds
          },
          {
            data: downloadSpeeds
          }
        ]
      });
    } catch (error) {
      console.error('更新网络图表时出错:', error);
    }
  }, [networkHistory]);
  
  // 安全获取网络数据
  const getNetworkData = (): NetworkInfo | null => {
    if (!data || !data.network) return null;
    return data.network;
  };
  
  const networkData = getNetworkData();

  // 添加加载状态动画
  const [isChartReady, setIsChartReady] = useState(false);
  const [isDataUpdating, setIsDataUpdating] = useState(false);
  
  // 当数据更新时触发动画
  useEffect(() => {
    if (networkHistory && networkHistory.length > 0) {
      setIsDataUpdating(true);
      const timer = setTimeout(() => {
        setIsDataUpdating(false);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [networkHistory]);
  
  // 图表初始化完成后设置状态
  useEffect(() => {
    if (chartInstance.current) {
      const timer = setTimeout(() => {
        setIsChartReady(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [chartInstance.current]);

  // 格式化字节数的函数
  const formatBytesLocal = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="bg-slate-800/90 backdrop-blur-sm border-slate-700 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300 relative overflow-hidden">
      {/* 加载状态遮罩 */}
      {!networkData && (
        <div className="absolute inset-0 bg-slate-800/80 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            <span className="text-sm text-slate-400 mt-2">加载网络数据中...</span>
          </div>
        </div>
      )}
      
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold text-white flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Network className="h-5 w-5 text-purple-400" />
          </div>
          网络流量
        </CardTitle>
        {networkData ? (
          <div className="text-right">
            <div className={`text-sm text-slate-400 ${isDataUpdating ? 'animate-pulse' : ''}`}>
              ↑ {formatSpeed(networkData.uploadSpeed !== undefined ? networkData.uploadSpeed : 0)}
            </div>
            <div className={`text-sm text-slate-400 ${isDataUpdating ? 'animate-pulse' : ''}`}>
              ↓ {formatSpeed(networkData.downloadSpeed !== undefined ? networkData.downloadSpeed : 0)}
            </div>
          </div>
        ) : (
          <div className="text-right">
            <div className="text-sm text-slate-400 animate-pulse">
              ↑ 加载中...
            </div>
            <div className="text-sm text-slate-400 animate-pulse">
              ↓ 加载中...
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="relative">
        <div 
          ref={chartRef} 
          className={`w-full h-64 transition-opacity duration-500 ${isChartReady ? 'opacity-100' : 'opacity-0'}`}
        />
        
        {/* 图表加载动画 */}
        {!isChartReady && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full max-w-md">
              <div className="h-1 w-full bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 animate-pulse-slow rounded-full" style={{width: '100%'}}></div>
              </div>
              <div className="mt-8 grid grid-cols-6 gap-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-16 bg-slate-700/50 rounded animate-pulse" style={{
                    animationDelay: `${i * 100}ms`,
                    animationDuration: '1.5s'
                  }}></div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {networkData && (
          <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-slate-400">总发送</div>
              <div className={`text-white font-medium ${isDataUpdating ? 'animate-pulse' : ''}`}>
                {networkData.totalSent ? formatBytesLocal(networkData.totalSent) : '0 B'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-slate-400">总接收</div>
              <div className={`text-white font-medium ${isDataUpdating ? 'animate-pulse' : ''}`}>
                {networkData.totalReceived ? formatBytesLocal(networkData.totalReceived) : '0 B'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-slate-400">连接数</div>
              <div className={`text-white font-medium ${isDataUpdating ? 'animate-pulse' : ''}`}>
                {networkData.connections ? networkData.connections.tcp + networkData.connections.udp : 0}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}