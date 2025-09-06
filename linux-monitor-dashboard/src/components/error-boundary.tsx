import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * 错误边界组件
 * 用于捕获子组件树中的 JavaScript 错误，记录错误并显示备用 UI
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // 更新 state，下次渲染时显示备用 UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 可以在这里记录错误信息
    console.error('组件错误:', error);
    console.error('错误详情:', errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback, componentName } = this.props;

    if (hasError) {
      // 如果提供了自定义的 fallback，则使用它
      if (fallback) {
        return fallback;
      }

      // 默认的错误 UI
      return (
        <Card className="bg-slate-800/90 backdrop-blur-sm border-red-700/50 shadow-lg shadow-red-900/20">
          <CardHeader className="border-b border-slate-700 pb-3">
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              {componentName ? `${componentName}组件出错` : '组件渲染错误'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-slate-300 mb-4">
              {error?.message || '渲染过程中发生错误，请尝试刷新页面或联系管理员。'}
            </div>
            <div className="text-xs text-slate-500 font-mono bg-slate-900/50 p-3 rounded-md mb-4 max-h-32 overflow-auto">
              {error?.stack || '无错误堆栈信息'}
            </div>
            <Button 
              variant="outline" 
              className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600"
              onClick={this.handleReset}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              尝试恢复
            </Button>
          </CardContent>
        </Card>
      );
    }

    return children;
  }
}

/**
 * 错误边界包装器
 * 用于方便地包装组件，提供错误边界保护
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
): React.FC<P> {
  const displayName = Component.displayName || Component.name || 'Component';
  
  const ComponentWithErrorBoundary: React.FC<P> = (props) => {
    return (
      <ErrorBoundary {...errorBoundaryProps} componentName={displayName}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;
  return ComponentWithErrorBoundary;
}