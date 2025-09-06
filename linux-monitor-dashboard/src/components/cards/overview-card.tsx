import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

interface OverviewCardProps {
  title: string;
  value: string;
  percentage: number;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'stable';
  color?: 'blue' | 'green' | 'yellow' | 'red';
  isLoading?: boolean;
}

export function OverviewCard({ 
  title, 
  value, 
  percentage, 
  icon: Icon, 
  trend = 'stable',
  color = 'blue',
  isLoading = false
}: OverviewCardProps) {
  // 添加动画状态
  const [isAnimating, setIsAnimating] = useState(false);
  const [prevValue, setPrevValue] = useState(value);
  const [prevPercentage, setPrevPercentage] = useState(percentage);
  
  // 当值变化时触发动画
  useEffect(() => {
    if (value !== prevValue || percentage !== prevPercentage) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setPrevValue(value);
        setPrevPercentage(percentage);
      }, 600); // 动画持续时间
      return () => clearTimeout(timer);
    }
  }, [value, percentage, prevValue, prevPercentage]);
  const colorClasses = {
    blue: {
      icon: 'text-blue-400',
      progress: 'bg-blue-500',
      text: 'text-blue-400',
      glow: 'shadow-blue-500/20'
    },
    green: {
      icon: 'text-green-400',
      progress: 'bg-green-500',
      text: 'text-green-400',
      glow: 'shadow-green-500/20'
    },
    yellow: {
      icon: 'text-yellow-400',
      progress: 'bg-yellow-500',
      text: 'text-yellow-400',
      glow: 'shadow-yellow-500/20'
    },
    red: {
      icon: 'text-red-400',
      progress: 'bg-red-500',
      text: 'text-red-400',
      glow: 'shadow-red-500/20'
    }
  };

  const getColorByPercentage = (percent: number) => {
    if (percent < 50) return 'green';
    if (percent < 80) return 'yellow';
    return 'red';
  };

  const dynamicColor = color === 'blue' ? getColorByPercentage(percentage) : color;
  const classes = colorClasses[dynamicColor];

  return (
    <Card className={`bg-slate-800/90 backdrop-blur-sm border-slate-700 hover:bg-slate-800 transition-all duration-300 hover:shadow-lg ${classes.glow} group relative overflow-hidden`}>
      {/* 加载状态遮罩 */}
      {isLoading && (
        <div className="absolute inset-0 bg-slate-800/80 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="animate-pulse flex space-x-1">
              <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
              <div className="h-2 w-2 bg-blue-400 rounded-full animation-delay-200"></div>
              <div className="h-2 w-2 bg-blue-400 rounded-full animation-delay-400"></div>
            </div>
            <span className="text-xs text-slate-400 mt-2">加载中...</span>
          </div>
        </div>
      )}
      
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-300 group-hover:text-slate-200 transition-colors">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-lg bg-slate-700/50 group-hover:bg-slate-700 transition-colors`}>
          <Icon className={`h-5 w-5 ${classes.icon} group-hover:scale-110 transition-transform duration-200`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold text-white mb-3 group-hover:text-slate-50 transition-colors ${isAnimating ? 'animate-pulse' : ''}`}>
          {value}
        </div>
        <div className="space-y-3">
          <Progress 
            value={isLoading ? 0 : percentage} 
            className={`h-2 bg-slate-700/50 ${isLoading ? 'animate-pulse' : ''}`}
            indicatorClassName={`${classes.progress} ${isAnimating ? 'transition-all duration-500 ease-out' : ''}`}
          />
          <div className="flex items-center justify-between text-xs">
            <span className={`${classes.text} font-medium ${isAnimating ? 'animate-pulse' : ''}`}>
              {percentage.toFixed(1)}%
            </span>
            <div className="flex items-center space-x-1">
              <span className={`${classes.text} text-xs`}>
                {trend === 'up' && '↗ 上升'}
                {trend === 'down' && '↘ 下降'}
                {trend === 'stable' && '→ 稳定'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}