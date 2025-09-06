import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { useMonitorStore } from '@/stores/monitor-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MemoryStick } from 'lucide-react';
import { formatBytes } from '@/utils/format';
import { MemoryInfo } from '@/types/monitor';

// 内联定义历史数据类型
interface HistoryItem {
  timestamp: number;
}

interface MemoryHistoryItem extends HistoryItem {
  percent: number;
  used: number;
}

export function MemoryChart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const { memoryHistory, data } = useMonitorStore();

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
        min: 0,
        max: 100,
        axisLine: {
          lineStyle: {
            color: '#475569'
          }
        },
        axisLabel: {
          color: '#94a3b8',
          formatter: '{value}%'
        },
        splitLine: {
          lineStyle: {
            color: '#334155'
          }
        }
      },
      series: [
        {
          name: '内存使用率',
          type: 'line',
          smooth: true,
          symbol: 'none',
          lineStyle: {
            color: '#10b981',
            width: 2
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              {
                offset: 0,
                color: 'rgba(16, 185, 129, 0.3)'
              },
              {
                offset: 1,
                color: 'rgba(16, 185, 129, 0.05)'
              }
            ])
          },
          data: []
        }
      ],
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1e293b',
        borderColor: '#475569',
        textStyle: {
          color: '#f1f5f9'
        },
        formatter: (params: any) => {
          const data = params[0];
          return `${data.name}<br/>内存使用率: ${data.value}%`;
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
    if (!memoryHistory || !Array.isArray(memoryHistory) || memoryHistory.length === 0) return;

    try {
      // 确保数据有效性
      const validHistory = memoryHistory.filter(item => 
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
      
      const values = validHistory.map(item => {
        const percent = item.percent !== undefined ? item.percent : 0;
        return isNaN(percent) ? '0' : percent.toFixed(1);
      });

      chartInstance.current.setOption({
        xAxis: {
          data: times
        },
        series: [{
          data: values
        }]
      });
    } catch (error) {
      console.error('更新内存图表时出错:', error);
    }
  }, [memoryHistory]);
  
  // 安全获取内存数据
  const getMemoryData = (): MemoryInfo | null => {
    if (!data || !data.memory) return null;
    return data.memory;
  };
  
  const memoryData = getMemoryData();

  // 添加加载状态动画
  const [isChartReady, setIsChartReady] = useState(false);
  const [isDataUpdating, setIsDataUpdating] = useState(false);
  
  // 当数据更新时触发动画
  useEffect(() => {
    if (memoryHistory && memoryHistory.length > 0) {
      setIsDataUpdating(true);
      const timer = setTimeout(() => {
        setIsDataUpdating(false);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [memoryHistory]);
  
  // 图表初始化完成后设置状态
  useEffect(() => {
    if (chartInstance.current) {
      const timer = setTimeout(() => {
        setIsChartReady(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [chartInstance.current]);

  return (
    <Card className="bg-slate-800/90 backdrop-blur-sm border-slate-700 hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300 relative overflow-hidden">
      {/* 加载状态遮罩 */}
      {!memoryData && (
        <div className="absolute inset-0 bg-slate-800/80 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            <span className="text-sm text-slate-400 mt-2">加载内存数据中...</span>
          </div>
        </div>
      )}
      
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold text-white flex items-center gap-3">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <MemoryStick className="h-5 w-5 text-green-400" />
          </div>
          内存使用率
        </CardTitle>
        {memoryData ? (
          <div className="text-right">
            <div className={`text-2xl font-bold text-white ${isDataUpdating ? 'animate-pulse' : ''}`}>
              {(memoryData.percent !== undefined && memoryData.percent !== null && !isNaN(memoryData.percent)) 
                ? memoryData.percent.toFixed(1) 
                : '0.0'}%
            </div>
            <div className={`text-sm text-slate-400 ${isDataUpdating ? 'animate-pulse' : ''}`}>
              {formatBytes(memoryData.used || 0)} / {formatBytes(memoryData.total || 0)}
            </div>
          </div>
        ) : (
          <div className="text-right">
            <div className="text-2xl font-bold text-slate-400 animate-pulse">
              加载中...
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
                <div className="h-full bg-green-500 animate-pulse-slow rounded-full" style={{width: '100%'}}></div>
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
        
        {memoryData && (
          <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-slate-400">总内存</div>
              <div className={`text-white font-medium ${isDataUpdating ? 'animate-pulse' : ''}`}>
                {formatBytes(memoryData.total || 0)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-slate-400">已用内存</div>
              <div className={`text-white font-medium ${isDataUpdating ? 'animate-pulse' : ''}`}>
                {formatBytes(memoryData.used || 0)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-slate-400">可用内存</div>
              <div className={`text-white font-medium ${isDataUpdating ? 'animate-pulse' : ''}`}>
                {formatBytes(memoryData.available || 0)}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}