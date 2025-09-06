import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { useMonitorStore } from '@/stores/monitor-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cpu, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { CpuInfo, SystemInfo } from '@/types/monitor';

// 内联定义历史数据类型
interface HistoryItem {
  timestamp: number;
}

interface CpuHistoryItem extends HistoryItem {
  usage: number;
}

export function EnhancedCpuChart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const { cpuHistory, data } = useMonitorStore();

  // 计算趋势
  const getTrend = () => {
    if (!cpuHistory || !Array.isArray(cpuHistory) || cpuHistory.length < 2) return 'stable';
    
    try {
      // 获取最近5个有效数据点
      const validHistory = cpuHistory.filter(item => 
        item && typeof item === 'object' && item.usage !== undefined && !isNaN(item.usage)
      );
      
      if (validHistory.length < 2) return 'stable';
      
      const recent = validHistory.slice(-5);
      const avg = recent.reduce((sum, item) => sum + (item.usage || 0), 0) / recent.length;
      const current = validHistory[validHistory.length - 1]?.usage || 0;
      
      if (current > avg + 5) return 'up';
      if (current < avg - 5) return 'down';
      return 'stable';
    } catch (error) {
      console.error('计算CPU趋势时出错:', error);
      return 'stable';
    }
  };

  const trend = getTrend();
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  useEffect(() => {
    if (!chartRef.current) return;

    chartInstance.current = echarts.init(chartRef.current, 'dark');

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      grid: {
        left: '3%',
        right: '4%',
        bottom: '8%',
        top: '10%',
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
          color: '#94a3b8',
          fontSize: 11
        },
        axisTick: {
          show: false
        }
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        axisLine: {
          show: false
        },
        axisLabel: {
          color: '#94a3b8',
          formatter: '{value}%',
          fontSize: 11
        },
        splitLine: {
          lineStyle: {
            color: '#334155',
            type: 'dashed'
          }
        },
        axisTick: {
          show: false
        }
      },
      series: [
        {
          name: 'CPU使用率',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: {
            color: '#3b82f6',
            width: 3,
            shadowColor: 'rgba(59, 130, 246, 0.3)',
            shadowBlur: 10
          },
          itemStyle: {
            color: '#3b82f6',
            borderColor: '#1e40af',
            borderWidth: 2
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              {
                offset: 0,
                color: 'rgba(59, 130, 246, 0.4)'
              },
              {
                offset: 0.5,
                color: 'rgba(59, 130, 246, 0.2)'
              },
              {
                offset: 1,
                color: 'rgba(59, 130, 246, 0.05)'
              }
            ])
          },
          data: [],
          emphasis: {
            focus: 'series',
            itemStyle: {
              color: '#60a5fa',
              borderColor: '#3b82f6',
              borderWidth: 3,
              shadowColor: 'rgba(59, 130, 246, 0.6)',
              shadowBlur: 15
            }
          }
        }
      ],
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: '#475569',
        borderWidth: 1,
        textStyle: {
          color: '#f1f5f9',
          fontSize: 12
        },
        formatter: (params: any) => {
          const data = params[0];
          return `
            <div style="padding: 8px;">
              <div style="color: #3b82f6; font-weight: bold; margin-bottom: 4px;">
                ${data.name}
              </div>
              <div style="display: flex; align-items: center;">
                <div style="width: 8px; height: 8px; background: #3b82f6; border-radius: 50%; margin-right: 8px;"></div>
                CPU使用率: <strong style="margin-left: 4px;">${data.value}%</strong>
              </div>
            </div>
          `;
        },
        axisPointer: {
          type: 'cross',
          crossStyle: {
            color: '#3b82f6',
            opacity: 0.6
          }
        }
      },
      animation: true,
      animationDuration: 1000,
      animationEasing: 'cubicOut'
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
    if (!cpuHistory || !Array.isArray(cpuHistory) || cpuHistory.length === 0) return;

    try {
      // 确保数据有效性
      const validHistory = cpuHistory.filter(item => 
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
        const usage = item.usage !== undefined ? item.usage : 0;
        return isNaN(usage) ? 0 : parseFloat(usage.toFixed(1));
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
      console.error('更新CPU图表时出错:', error);
    }
  }, [cpuHistory]);

  const getStatusColor = (usage: number) => {
    if (isNaN(usage)) return 'text-slate-400';
    if (usage < 50) return 'text-green-400';
    if (usage < 80) return 'text-yellow-400';
    return 'text-red-400';
  };
  
  // 安全获取CPU和系统数据
  const getCpuData = (): CpuInfo | null => {
    if (!data || !data.cpu) return null;
    return data.cpu;
  };
  
  const getSystemData = (): SystemInfo | null => {
    if (!data || !data.system) return null;
    return data.system;
  };
  
  const cpuData = getCpuData();
  const systemData = getSystemData();

  // 添加加载状态动画
  const [isChartReady, setIsChartReady] = useState(false);
  const [isDataUpdating, setIsDataUpdating] = useState(false);
  
  // 当数据更新时触发动画
  useEffect(() => {
    if (cpuHistory && cpuHistory.length > 0) {
      setIsDataUpdating(true);
      const timer = setTimeout(() => {
        setIsDataUpdating(false);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [cpuHistory]);
  
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
    <Card className="bg-slate-800/90 backdrop-blur-sm border-slate-700 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 relative overflow-hidden">
      {/* 加载状态遮罩 */}
      {!cpuData && (
        <div className="absolute inset-0 bg-slate-800/80 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="text-sm text-slate-400 mt-2">加载CPU数据中...</span>
          </div>
        </div>
      )}
      
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold text-white flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Cpu className="h-5 w-5 text-blue-400" />
          </div>
          CPU使用率
        </CardTitle>
        {cpuData ? (
          <div className="text-right">
            <div className={`text-3xl font-bold ${getStatusColor(cpuData.usage || 0)} mb-1 ${isDataUpdating ? 'animate-pulse' : ''}`}>
              {(cpuData.usage !== undefined && !isNaN(cpuData.usage)) 
                ? cpuData.usage.toFixed(1) 
                : '0.0'}%
            </div>
            <div className="flex items-center justify-end space-x-2 text-sm text-slate-400">
              <span>{cpuData.cores && Array.isArray(cpuData.cores) ? cpuData.cores.length : 0} 核心</span>
              <TrendIcon className={`h-4 w-4 ${
                trend === 'up' ? 'text-red-400' : 
                trend === 'down' ? 'text-green-400' : 
                'text-slate-400'
              }`} />
            </div>
          </div>
        ) : (
          <div className="text-right">
            <div className="text-3xl font-bold text-slate-400 mb-1 animate-pulse">
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
                <div className="h-full bg-blue-500 animate-pulse-slow rounded-full" style={{width: '100%'}}></div>
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
        
        {cpuData && systemData ? (
          <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-slate-400">频率</div>
              <div className={`text-white font-medium ${isDataUpdating ? 'animate-pulse' : ''}`}>
                {cpuData.frequency !== undefined ? `${cpuData.frequency} MHz` : 'N/A'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-slate-400">温度</div>
              <div className={`text-white font-medium ${isDataUpdating ? 'animate-pulse' : ''}`}>
                {cpuData.temperature !== undefined && cpuData.temperature !== null && !isNaN(cpuData.temperature) 
                  ? `${cpuData.temperature.toFixed(1)}°C` 
                  : 'N/A'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-slate-400">负载</div>
              <div className={`text-white font-medium ${isDataUpdating ? 'animate-pulse' : ''}`}>
                {systemData.loadAverage && Array.isArray(systemData.loadAverage) && 
                 systemData.loadAverage.length > 0 && 
                 systemData.loadAverage[0] !== undefined && 
                 !isNaN(systemData.loadAverage[0])
                  ? systemData.loadAverage[0].toFixed(2) 
                  : 'N/A'}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 text-center text-slate-400 animate-pulse">
            加载CPU详细信息中...
          </div>
        )}
      </CardContent>
    </Card>
  );
}