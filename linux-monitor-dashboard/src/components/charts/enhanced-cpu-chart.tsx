import { useEffect, useRef, useState, useCallback } from 'react';
import * as echarts from 'echarts';
import { useMonitorStore } from '@/stores/monitor-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cpu, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { CpuInfo, SystemInfo } from '@/types/monitor';
import { formatFrequency } from '@/utils/format';

// ==================== 常量定义 ====================

// 趋势计算相关常量
const TREND_DATA_POINTS_COUNT = 5;
const TREND_THRESHOLD_PERCENT = 5;

// 图表配置常量
const CHART_ANIMATION_DURATION = 1000;
const CHART_LOADING_DELAY_MS = 500;
const DATA_UPDATE_ANIMATION_MS = 600;

// 颜色配置
const COLORS = {
  primary: '#3b82f6',
  primaryDark: '#1e40af',
  primaryLight: '#60a5fa',
  gridLine: '#334155',
  axisLine: '#475569',
  axisLabel: '#94a3b8',
  tooltipBg: 'rgba(15, 23, 42, 0.95)',
  tooltipText: '#f1f5f9',
} as const;

// 状态颜色映射
const STATUS_COLOR_MAP = {
  low: 'text-green-400',
  medium: 'text-yellow-400',
  high: 'text-red-400',
  unknown: 'text-slate-400',
} as const;

// ==================== 类型定义 ====================

interface HistoryItem {
  timestamp: number;
}

interface CpuHistoryItem extends HistoryItem {
  usage: number;
}

// ==================== 工具函数 ====================

/**
 * 验证CPU历史数据项是否有效
 */
const isValidCpuHistoryItem = (item: unknown): item is CpuHistoryItem => {
  return (
    item !== null &&
    typeof item === 'object' &&
    'usage' in item &&
    'timestamp' in item &&
    typeof (item as CpuHistoryItem).usage === 'number' &&
    !isNaN((item as CpuHistoryItem).usage)
  );
};

/**
 * 过滤并验证CPU历史数据
 */
const filterValidHistory = (history: unknown[]): CpuHistoryItem[] => {
  return history.filter(isValidCpuHistoryItem);
};

/**
 * 计算CPU使用率趋势
 * @param cpuHistory CPU历史数据数组
 * @returns 'up' | 'down' | 'stable'
 */
const calculateTrend = (cpuHistory: unknown[]): 'up' | 'down' | 'stable' => {
  if (!Array.isArray(cpuHistory) || cpuHistory.length < 2) {
    return 'stable';
  }

  const validHistory = filterValidHistory(cpuHistory);
  
  if (validHistory.length < 2) {
    return 'stable';
  }

  const recentData = validHistory.slice(-TREND_DATA_POINTS_COUNT);
  const averageUsage = recentData.reduce((sum, item) => sum + item.usage, 0) / recentData.length;
  const currentUsage = validHistory[validHistory.length - 1].usage;

  if (currentUsage > averageUsage + TREND_THRESHOLD_PERCENT) {
    return 'up';
  }
  
  if (currentUsage < averageUsage - TREND_THRESHOLD_PERCENT) {
    return 'down';
  }
  
  return 'stable';
};

/**
 * 根据CPU使用率获取状态颜色类名
 */
const getStatusColorClass = (usage: number): string => {
  if (isNaN(usage)) {
    return STATUS_COLOR_MAP.unknown;
  }
  
  if (usage < 50) {
    return STATUS_COLOR_MAP.low;
  }
  
  if (usage < 80) {
    return STATUS_COLOR_MAP.medium;
  }
  
  return STATUS_COLOR_MAP.high;
};

/**
 * 格式化时间戳为本地时间字符串
 */
const formatTimestamp = (timestamp: number): string => {
  try {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '无效时间';
  }
};

/**
 * 安全格式化数值，处理undefined和NaN
 */
const safeFormatNumber = (value: number | undefined, decimals: number): string => {
  if (value === undefined || isNaN(value)) {
    return '0.0';
  }
  return value.toFixed(decimals);
};

// ==================== 主组件 ====================

export function EnhancedCpuChart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const { cpuHistory, data } = useMonitorStore();

  const [isChartReady, setIsChartReady] = useState(false);
  const [isDataUpdating, setIsDataUpdating] = useState(false);

  // 计算趋势（使用 useMemo 优化）
  const trend = calculateTrend(cpuHistory);
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  // 获取图表配置对象（提取为独立函数，避免每次渲染重建）
  const getChartOption = useCallback((): echarts.EChartsOption => {
    return {
      backgroundColor: 'transparent',
      grid: {
        left: '3%',
        right: '4%',
        bottom: '8%',
        top: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: [],
        axisLine: {
          lineStyle: {
            color: COLORS.axisLine,
          },
        },
        axisLabel: {
          color: COLORS.axisLabel,
          fontSize: 11,
        },
        axisTick: {
          show: false,
        },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        axisLine: {
          show: false,
        },
        axisLabel: {
          color: COLORS.axisLabel,
          formatter: '{value}%',
          fontSize: 11,
        },
        splitLine: {
          lineStyle: {
            color: COLORS.gridLine,
            type: 'dashed',
          },
        },
        axisTick: {
          show: false,
        },
      },
      series: [
        {
          name: 'CPU使用率',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: {
            color: COLORS.primary,
            width: 3,
            shadowColor: 'rgba(59, 130, 246, 0.3)',
            shadowBlur: 10,
          },
          itemStyle: {
            color: COLORS.primary,
            borderColor: COLORS.primaryDark,
            borderWidth: 2,
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(59, 130, 246, 0.4)' },
              { offset: 0.5, color: 'rgba(59, 130, 246, 0.2)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.05)' },
            ]),
          },
          data: [],
          emphasis: {
            focus: 'series',
            itemStyle: {
              color: COLORS.primaryLight,
              borderColor: COLORS.primary,
              borderWidth: 3,
              shadowColor: 'rgba(59, 130, 246, 0.6)',
              shadowBlur: 15,
            },
          },
        },
      ],
      tooltip: {
        trigger: 'axis',
        backgroundColor: COLORS.tooltipBg,
        borderColor: COLORS.axisLine,
        borderWidth: 1,
        textStyle: {
          color: COLORS.tooltipText,
          fontSize: 12,
        },
        formatter: (params: unknown) => {
          const paramsArray = params as Array<{ name: string; value: number }>;
          if (!paramsArray || paramsArray.length === 0) {
            return '';
          }
          
          const dataPoint = paramsArray[0];
          return `
            <div style="padding: 8px;">
              <div style="color: ${COLORS.primary}; font-weight: bold; margin-bottom: 4px;">
                ${dataPoint.name}
              </div>
              <div style="display: flex; align-items: center;">
                <div style="width: 8px; height: 8px; background: ${COLORS.primary}; border-radius: 50%; margin-right: 8px;"></div>
                CPU使用率: <strong style="margin-left: 4px;">${dataPoint.value}%</strong>
              </div>
            </div>
          `;
        },
        axisPointer: {
          type: 'cross',
          crossStyle: {
            color: COLORS.primary,
            opacity: 0.6,
          },
        },
      },
      animation: true,
      animationDuration: CHART_ANIMATION_DURATION,
      animationEasing: 'cubicOut',
    };
  }, []);

  // 初始化图表
  useEffect(() => {
    if (!chartRef.current) {
      return;
    }

    // 初始化图表实例
    chartInstance.current = echarts.init(chartRef.current, 'dark');
    chartInstance.current.setOption(getChartOption());

    // 设置图表加载完成状态
    const chartReadyTimer = setTimeout(() => {
      setIsChartReady(true);
    }, CHART_LOADING_DELAY_MS);

    // 响应窗口大小变化
    const handleResize = () => {
      chartInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    // 清理函数
    return () => {
      clearTimeout(chartReadyTimer);
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
      chartInstance.current = null;
    };
  }, [getChartOption]);

  // 更新图表数据
  useEffect(() => {
    if (!chartInstance.current) {
      return;
    }

    if (!Array.isArray(cpuHistory) || cpuHistory.length === 0) {
      return;
    }

    const validHistory = filterValidHistory(cpuHistory);
    
    if (validHistory.length === 0) {
      return;
    }

    // 触发数据更新动画
    setIsDataUpdating(true);
    const updateAnimationTimer = setTimeout(() => {
      setIsDataUpdating(false);
    }, DATA_UPDATE_ANIMATION_MS);

    // 准备图表数据
    const timeLabels = validHistory.map(item => formatTimestamp(item.timestamp));
    const usageValues = validHistory.map(item => parseFloat(item.usage.toFixed(1)));

    // 更新图表
    chartInstance.current.setOption({
      xAxis: {
        data: timeLabels,
      },
      series: [{
        data: usageValues,
      }],
    });

    return () => {
      clearTimeout(updateAnimationTimer);
    };
  }, [cpuHistory]);

  // 安全获取CPU数据
  const cpuData: CpuInfo | null = data?.cpu ?? null;
  
  // 安全获取系统数据
  const systemData: SystemInfo | null = data?.system ?? null;

  // 获取核心数量
  const coreCount = Array.isArray(cpuData?.cores) ? cpuData.cores.length : 0;
  
  // 获取CPU使用率
  const cpuUsage = cpuData?.usage ?? 0;
  
  // 获取频率信息
  const frequencyDisplay = cpuData?.frequency !== undefined 
    ? formatFrequency(cpuData.frequency) 
    : 'N/A';
  
  // 获取温度信息
  const temperatureDisplay = (cpuData?.temperature !== undefined && 
                              cpuData?.temperature !== null && 
                              !isNaN(cpuData.temperature))
    ? `${cpuData.temperature.toFixed(1)}°C`
    : 'N/A';
  
  // 获取负载信息
  const loadAverageDisplay = (systemData?.loadAverage && 
                              Array.isArray(systemData.loadAverage) && 
                              systemData.loadAverage.length > 0 && 
                              systemData.loadAverage[0] !== undefined && 
                              !isNaN(systemData.loadAverage[0]))
    ? systemData.loadAverage[0].toFixed(2)
    : 'N/A';

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
            <div className={`text-3xl font-bold ${getStatusColorClass(cpuUsage)} mb-1 ${isDataUpdating ? 'animate-pulse' : ''}`}>
              {safeFormatNumber(cpuUsage, 1)}%
            </div>
            <div className="flex items-center justify-end space-x-2 text-sm text-slate-400">
              <span>{coreCount} 核心</span>
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
                {[...Array(6)].map((_, index) => (
                  <div 
                    key={index} 
                    className="h-16 bg-slate-700/50 rounded animate-pulse" 
                    style={{
                      animationDelay: `${index * 100}ms`,
                      animationDuration: '1.5s',
                    }}
                  />
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
                {frequencyDisplay}
              </div>
            </div>
            <div className="text-center">
              <div className="text-slate-400">温度</div>
              <div className={`text-white font-medium ${isDataUpdating ? 'animate-pulse' : ''}`}>
                {temperatureDisplay}
              </div>
            </div>
            <div className="text-center">
              <div className="text-slate-400">负载</div>
              <div className={`text-white font-medium ${isDataUpdating ? 'animate-pulse' : ''}`}>
                {loadAverageDisplay}
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
