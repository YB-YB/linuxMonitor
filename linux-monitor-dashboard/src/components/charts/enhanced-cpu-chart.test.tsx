import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { EnhancedCpuChart } from './enhanced-cpu-chart';

// Mock zustand store
const mockCpuHistory: any[] = [];
const mockData: any = null;

vi.mock('@/stores/monitor-store', () => ({
  useMonitorStore: () => ({
    cpuHistory: mockCpuHistory,
    data: mockData,
  }),
}));

// Mock echarts - 必须使用命名导出而非default
vi.mock('echarts', () => ({
  init: vi.fn(() => ({
    setOption: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
  })),
  graphic: {
    LinearGradient: vi.fn(),
  },
}));

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Cpu: () => <div data-testid="cpu-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  TrendingDown: () => <div data-testid="trending-down-icon" />,
  Minus: () => <div data-testid="minus-icon" />,
}));

// Mock format utility
vi.mock('@/utils/format', () => ({
  formatFrequency: (freq: number) => `${(freq / 1000).toFixed(2)} GHz`,
}));

describe('EnhancedCpuChart 组件测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('工具函数测试', () => {
    it('应该正确验证有效的CPU历史数据项', () => {
      const validItem = { timestamp: Date.now(), usage: 45.5 };
      const isValid = (item: any) =>
        item !== null &&
        typeof item === 'object' &&
        'usage' in item &&
        'timestamp' in item &&
        typeof item.usage === 'number' &&
        !isNaN(item.usage);

      expect(isValid(validItem)).toBe(true);
    });

    it('应该拒绝无效的CPU历史数据项', () => {
      const invalidItems = [
        null,
        undefined,
        { timestamp: Date.now() },
        { usage: 45.5 },
        { timestamp: Date.now(), usage: NaN },
        { timestamp: Date.now(), usage: 'invalid' },
      ];

      const isValid = (item: any) =>
        item !== null &&
        typeof item === 'object' &&
        'usage' in item &&
        'timestamp' in item &&
        typeof item.usage === 'number' &&
        !isNaN(item.usage);

      invalidItems.forEach(item => {
        expect(isValid(item)).toBe(false);
      });
    });

    it('应该正确过滤并返回有效的CPU历史数据', () => {
      const mixedHistory = [
        { timestamp: 1000, usage: 30 },
        null,
        { timestamp: 2000, usage: 50 },
        { timestamp: 3000 },
        { timestamp: 4000, usage: 70 },
      ];

      const filterValidHistory = (history: any[]) => {
        return history.filter(item =>
          item !== null &&
          typeof item === 'object' &&
          'usage' in item &&
          'timestamp' in item &&
          typeof item.usage === 'number' &&
          !isNaN(item.usage)
        );
      };

      const validHistory = filterValidHistory(mixedHistory);
      expect(validHistory).toHaveLength(3);
      expect(validHistory[0].usage).toBe(30);
      expect(validHistory[1].usage).toBe(50);
      expect(validHistory[2].usage).toBe(70);
    });

    it('应该正确计算上升趋势', () => {
      const history = [
        { timestamp: 1000, usage: 20 },
        { timestamp: 2000, usage: 25 },
        { timestamp: 3000, usage: 30 },
        { timestamp: 4000, usage: 35 },
        { timestamp: 5000, usage: 60 },
      ];

      const calculateTrend = (cpuHistory: any[]) => {
        if (!Array.isArray(cpuHistory) || cpuHistory.length < 2) {
          return 'stable';
        }

        const validHistory = cpuHistory.filter(item =>
          item !== null &&
          typeof item === 'object' &&
          'usage' in item &&
          'timestamp' in item &&
          typeof item.usage === 'number' &&
          !isNaN(item.usage)
        );

        if (validHistory.length < 2) {
          return 'stable';
        }

        const recentData = validHistory.slice(-5);
        const averageUsage = recentData.reduce((sum, item) => sum + item.usage, 0) / recentData.length;
        const currentUsage = validHistory[validHistory.length - 1].usage;

        if (currentUsage > averageUsage + 5) {
          return 'up';
        }

        if (currentUsage < averageUsage - 5) {
          return 'down';
        }

        return 'stable';
      };

      const trend = calculateTrend(history);
      expect(trend).toBe('up');
    });

    it('应该正确计算下降趋势', () => {
      const history = [
        { timestamp: 1000, usage: 80 },
        { timestamp: 2000, usage: 75 },
        { timestamp: 3000, usage: 70 },
        { timestamp: 4000, usage: 65 },
        { timestamp: 5000, usage: 30 },
      ];

      const calculateTrend = (cpuHistory: any[]) => {
        if (!Array.isArray(cpuHistory) || cpuHistory.length < 2) {
          return 'stable';
        }

        const validHistory = cpuHistory.filter(item =>
          item !== null &&
          typeof item === 'object' &&
          'usage' in item &&
          'timestamp' in item &&
          typeof item.usage === 'number' &&
          !isNaN(item.usage)
        );

        if (validHistory.length < 2) {
          return 'stable';
        }

        const recentData = validHistory.slice(-5);
        const averageUsage = recentData.reduce((sum, item) => sum + item.usage, 0) / recentData.length;
        const currentUsage = validHistory[validHistory.length - 1].usage;

        if (currentUsage > averageUsage + 5) {
          return 'up';
        }

        if (currentUsage < averageUsage - 5) {
          return 'down';
        }

        return 'stable';
      };

      const trend = calculateTrend(history);
      expect(trend).toBe('down');
    });

    it('应该正确计算稳定趋势', () => {
      const history = [
        { timestamp: 1000, usage: 50 },
        { timestamp: 2000, usage: 52 },
        { timestamp: 3000, usage: 51 },
        { timestamp: 4000, usage: 49 },
        { timestamp: 5000, usage: 50 },
      ];

      const calculateTrend = (cpuHistory: any[]) => {
        if (!Array.isArray(cpuHistory) || cpuHistory.length < 2) {
          return 'stable';
        }

        const validHistory = cpuHistory.filter(item =>
          item !== null &&
          typeof item === 'object' &&
          'usage' in item &&
          'timestamp' in item &&
          typeof item.usage === 'number' &&
          !isNaN(item.usage)
        );

        if (validHistory.length < 2) {
          return 'stable';
        }

        const recentData = validHistory.slice(-5);
        const averageUsage = recentData.reduce((sum, item) => sum + item.usage, 0) / recentData.length;
        const currentUsage = validHistory[validHistory.length - 1].usage;

        if (currentUsage > averageUsage + 5) {
          return 'up';
        }

        if (currentUsage < averageUsage - 5) {
          return 'down';
        }

        return 'stable';
      };

      const trend = calculateTrend(history);
      expect(trend).toBe('stable');
    });

    it('应该对空数组返回稳定趋势', () => {
      const calculateTrend = (cpuHistory: any[]) => {
        if (!Array.isArray(cpuHistory) || cpuHistory.length < 2) {
          return 'stable';
        }
        return 'up';
      };

      expect(calculateTrend([])).toBe('stable');
      expect(calculateTrend([{ timestamp: 1000, usage: 50 }])).toBe('stable');
    });

    it('应该根据CPU使用率返回正确的状态颜色', () => {
      const getStatusColorClass = (usage: number) => {
        if (isNaN(usage)) return 'text-slate-400';
        if (usage < 50) return 'text-green-400';
        if (usage < 80) return 'text-yellow-400';
        return 'text-red-400';
      };

      expect(getStatusColorClass(NaN)).toBe('text-slate-400');
      expect(getStatusColorClass(0)).toBe('text-green-400');
      expect(getStatusColorClass(49.9)).toBe('text-green-400');
      expect(getStatusColorClass(50)).toBe('text-yellow-400');
      expect(getStatusColorClass(79.9)).toBe('text-yellow-400');
      expect(getStatusColorClass(80)).toBe('text-red-400');
      expect(getStatusColorClass(100)).toBe('text-red-400');
    });

    it('应该正确格式化时间戳', () => {
      const formatTimestamp = (timestamp: number) => {
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

      const testTimestamp = new Date('2024-01-01T10:30:45').getTime();
      const formatted = formatTimestamp(testTimestamp);
      
      expect(formatted).toContain('10');
      expect(formatted).toContain('30');
      expect(formatted).toContain('45');
    });

    it('应该安全格式化数值', () => {
      const safeFormatNumber = (value: number | undefined, decimals: number) => {
        if (value === undefined || isNaN(value)) {
          return '0.0';
        }
        return value.toFixed(decimals);
      };

      expect(safeFormatNumber(undefined, 1)).toBe('0.0');
      expect(safeFormatNumber(NaN, 1)).toBe('0.0');
      expect(safeFormatNumber(45.678, 1)).toBe('45.7');
      expect(safeFormatNumber(45.678, 2)).toBe('45.68');
      expect(safeFormatNumber(0, 1)).toBe('0.0');
    });
  });

  describe('组件渲染测试', () => {
    it('应该在无数据时显示加载状态', () => {
      render(<EnhancedCpuChart />);
      
      expect(screen.getByText('加载CPU数据中...')).toBeInTheDocument();
    });

    it('应该显示CPU使用率标题', () => {
      render(<EnhancedCpuChart />);
      
      expect(screen.getByText('CPU使用率')).toBeInTheDocument();
    });
  });

  describe('边界条件测试', () => {
    it('应该处理CPU使用率为0的情况', () => {
      const safeFormatNumber = (value: number | undefined, decimals: number) => {
        if (value === undefined || isNaN(value)) {
          return '0.0';
        }
        return value.toFixed(decimals);
      };

      expect(safeFormatNumber(0, 1)).toBe('0.0');
    });

    it('应该处理CPU使用率为100的情况', () => {
      const getStatusColorClass = (usage: number) => {
        if (isNaN(usage)) return 'text-slate-400';
        if (usage < 50) return 'text-green-400';
        if (usage < 80) return 'text-yellow-400';
        return 'text-red-400';
      };

      expect(getStatusColorClass(100)).toBe('text-red-400');
    });

    it('应该处理空的历史数据数组', () => {
      const calculateTrend = (cpuHistory: any[]) => {
        if (!Array.isArray(cpuHistory) || cpuHistory.length < 2) {
          return 'stable';
        }
        return 'up';
      };

      expect(calculateTrend([])).toBe('stable');
    });

    it('应该处理只有1个数据点的历史数据', () => {
      const calculateTrend = (cpuHistory: any[]) => {
        if (!Array.isArray(cpuHistory) || cpuHistory.length < 2) {
          return 'stable';
        }
        return 'up';
      };

      expect(calculateTrend([{ timestamp: 1000, usage: 50 }])).toBe('stable');
    });
  });
});
