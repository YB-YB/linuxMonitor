import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { useMonitorStore } from '@/stores/monitor-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cpu } from 'lucide-react';

export function CpuChart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const { cpuHistory, currentData } = useMonitorStore();

  useEffect(() => {
    if (!chartRef.current) return;

    // 初始化图表
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
          name: 'CPU使用率',
          type: 'line',
          smooth: true,
          symbol: 'none',
          lineStyle: {
            color: '#3b82f6',
            width: 2
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              {
                offset: 0,
                color: 'rgba(59, 130, 246, 0.3)'
              },
              {
                offset: 1,
                color: 'rgba(59, 130, 246, 0.05)'
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
          return `${data.name}<br/>CPU使用率: ${data.value}%`;
        }
      }
    };

    chartInstance.current.setOption(option);

    // 响应式处理
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
    if (!chartInstance.current || cpuHistory.length === 0) return;

    const times = cpuHistory.map(item => 
      new Date(item.timestamp).toLocaleTimeString('zh-CN', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    );
    const values = cpuHistory.map(item => item.usage.toFixed(1));

    chartInstance.current.setOption({
      xAxis: {
        data: times
      },
      series: [{
        data: values
      }]
    });
  }, [cpuHistory]);

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
          <Cpu className="h-5 w-5 text-blue-400" />
          CPU使用率
        </CardTitle>
        {currentData && (
          <div className="text-right">
            <div className="text-2xl font-bold text-white">
              {currentData.cpu.usage.toFixed(1)}%
            </div>
            <div className="text-sm text-slate-400">
              {currentData.cpu.cores.length} 核心
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div 
          ref={chartRef} 
          className="w-full h-64"
        />
      </CardContent>
    </Card>
  );
}