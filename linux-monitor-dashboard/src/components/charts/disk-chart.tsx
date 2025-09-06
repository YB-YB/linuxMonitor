import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { useMonitorStore } from '@/stores/monitor-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HardDrive, Activity } from 'lucide-react';
import { formatBytes, formatSpeed } from '@/utils/format';
import { DiskInfo } from '@/types/monitor';

// 内联定义历史数据类型
interface HistoryItem {
  timestamp: number;
}

interface DiskHistoryItem extends HistoryItem {
  readSpeed: number;
  writeSpeed: number;
  percent: number;
}

export function DiskChart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const { diskHistory, data } = useMonitorStore();

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
      yAxis: [
        {
          type: 'value',
          name: '使用率 (%)',
          position: 'left',
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
          min: 0,
          max: 100
        },
        {
          type: 'value',
          name: 'I/O速度',
          position: 'right',
          axisLine: {
            show: false
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
            },
            fontSize: 11
          },
          splitLine: {
            show: false
          }
        }
      ],
      series: [
        {
          name: '磁盘使用率',
          type: 'line',
          yAxisIndex: 0,
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: {
            color: '#f59e0b',
            width: 3,
            shadowColor: 'rgba(245, 158, 11, 0.3)',
            shadowBlur: 10
          },
          itemStyle: {
            color: '#f59e0b',
            borderColor: '#d97706',
            borderWidth: 2
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              {
                offset: 0,
                color: 'rgba(245, 158, 11, 0.3)'
              },
              {
                offset: 1,
                color: 'rgba(245, 158, 11, 0.05)'
              }
            ])
          },
          data: []
        },
        {
          name: '读取速度',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          symbol: 'none',
          lineStyle: {
            color: '#10b981',
            width: 2
          },
          data: []
        },
        {
          name: '写入速度',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          symbol: 'none',
          lineStyle: {
            color: '#ef4444',
            width: 2
          },
          data: []
        }
      ],
      legend: {
        data: ['磁盘使用率', '读取速度', '写入速度'],
        textStyle: {
          color: '#94a3b8'
        },
        bottom: 0
      },
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
          let result = `<div style="padding: 8px;"><div style="color: #f59e0b; font-weight: bold; margin-bottom: 4px;">${params[0].name}</div>`;
          params.forEach((param: any) => {
            const color = param.seriesName === '磁盘使用率' ? '#f59e0b' : 
                         param.seriesName === '读取速度' ? '#10b981' : '#ef4444';
            const unit = param.seriesName === '磁盘使用率' ? '%' : '';
            const value = param.seriesName === '磁盘使用率' ? param.value : formatSpeed(param.value);
            result += `<div style="display: flex; align-items: center; margin-bottom: 2px;">
              <div style="width: 8px; height: 8px; background: ${color}; border-radius: 50%; margin-right: 8px;"></div>
              ${param.seriesName}: <strong style="margin-left: 4px;">${value}${unit}</strong>
            </div>`;
          });
          result += '</div>';
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
    if (!diskHistory || !Array.isArray(diskHistory) || diskHistory.length === 0) return;

    try {
      // 确保数据有效性
      const validHistory = diskHistory.filter(item => 
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
      
      const usageData = validHistory.map(item => {
        const percent = item.percent !== undefined ? item.percent : 0;
        return isNaN(percent) ? '0' : percent.toFixed(1);
      });
      
      const readData = validHistory.map(item => {
        return item.readSpeed !== undefined ? item.readSpeed : 0;
      });
      
      const writeData = validHistory.map(item => {
        return item.writeSpeed !== undefined ? item.writeSpeed : 0;
      });

      chartInstance.current.setOption({
        xAxis: {
          data: times
        },
        series: [
          { data: usageData },
          { data: readData },
          { data: writeData }
        ]
      });
    } catch (error) {
      console.error('更新磁盘图表时出错:', error);
    }
  }, [diskHistory]);

  const getStatusColor = (usage: number) => {
    if (isNaN(usage)) return 'text-slate-400';
    if (usage < 70) return 'text-green-400';
    if (usage < 90) return 'text-yellow-400';
    return 'text-red-400';
  };
  
  // 安全获取磁盘数据
  const getDiskData = (): DiskInfo | null => {
    if (!data || !data.disk) return null;
    return data.disk;
  };
  
  const diskData = getDiskData();

  // 添加加载状态动画
  const [isChartReady, setIsChartReady] = useState(false);
  const [isDataUpdating, setIsDataUpdating] = useState(false);
  
  // 当数据更新时触发动画
  useEffect(() => {
    if (diskHistory && diskHistory.length > 0) {
      setIsDataUpdating(true);
      const timer = setTimeout(() => {
        setIsDataUpdating(false);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [diskHistory]);
  
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
    <Card className="bg-slate-800/90 backdrop-blur-sm border-slate-700 hover:shadow-lg hover:shadow-orange-500/10 transition-all duration-300 relative overflow-hidden">
      {/* 加载状态遮罩 */}
      {!diskData && (
        <div className="absolute inset-0 bg-slate-800/80 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            <span className="text-sm text-slate-400 mt-2">加载磁盘数据中...</span>
          </div>
        </div>
      )}
      
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold text-white flex items-center gap-3">
          <div className="p-2 bg-orange-500/20 rounded-lg">
            <HardDrive className="h-5 w-5 text-orange-400" />
          </div>
          磁盘使用情况
        </CardTitle>
        {diskData ? (
          <div className="text-right">
            <div className={`text-3xl font-bold ${getStatusColor(diskData.percent || 0)} mb-1 ${isDataUpdating ? 'animate-pulse' : ''}`}>
              {(diskData.percent !== undefined && diskData.percent !== null && !isNaN(diskData.percent)) 
                ? diskData.percent.toFixed(1) 
                : '0.0'}%
            </div>
            <div className={`text-sm text-slate-400 ${isDataUpdating ? 'animate-pulse' : ''}`}>
              {formatBytes(diskData.used || 0)} / {formatBytes(diskData.total || 0)}
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
                <div className="h-full bg-orange-500 animate-pulse-slow rounded-full" style={{width: '100%'}}></div>
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
        
        {diskData ? (
          <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-slate-400">可用空间</div>
              <div className={`text-white font-medium ${isDataUpdating ? 'animate-pulse' : ''}`}>
                {formatBytes(diskData.free || 0)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-slate-400 flex items-center justify-center gap-1">
                <Activity className="h-3 w-3" />
                读取速度
              </div>
              <div className={`text-green-400 font-medium ${isDataUpdating ? 'animate-pulse' : ''}`}>
                {formatSpeed(diskData.readSpeed !== undefined ? diskData.readSpeed : 0)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-slate-400 flex items-center justify-center gap-1">
                <Activity className="h-3 w-3" />
                写入速度
              </div>
              <div className={`text-red-400 font-medium ${isDataUpdating ? 'animate-pulse' : ''}`}>
                {formatSpeed(diskData.writeSpeed !== undefined ? diskData.writeSpeed : 0)}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 text-center text-slate-400 animate-pulse">
            加载磁盘详细信息中...
          </div>
        )}
      </CardContent>
    </Card>
  );
}