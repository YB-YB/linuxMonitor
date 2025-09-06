import { ErrorBoundary } from './error-boundary';
import { Button } from '@/components/ui/button';
import { RefreshCw, Home } from 'lucide-react';

interface GlobalErrorBoundaryProps {
  children: React.ReactNode;
}

/**
 * 全局错误边界组件
 * 用于捕获整个应用中的错误
 */
export function GlobalErrorBoundary({ children }: GlobalErrorBoundaryProps) {
  const handleReset = () => {
    // 刷新页面
    window.location.reload();
  };

  const handleGoHome = () => {
    // 返回首页
    window.location.href = '/';
  };

  const fallback = (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 rounded-lg shadow-lg border border-red-700/30">
        <div className="p-6">
          <div className="flex items-center justify-center mb-6">
            <div className="h-16 w-16 bg-red-500/20 rounded-full flex items-center justify-center">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-10 w-10 text-red-400" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white text-center mb-2">
            系统监控出错
          </h2>
          <p className="text-slate-300 text-center mb-6">
            应用程序遇到了意外错误，请尝试刷新页面或返回首页。
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              variant="default" 
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleReset}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              刷新页面
            </Button>
            <Button 
              variant="outline" 
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
              onClick={handleGoHome}
            >
              <Home className="h-4 w-4 mr-2" />
              返回首页
            </Button>
          </div>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-b-lg border-t border-slate-700">
          <p className="text-xs text-slate-400 text-center">
            如果问题持续存在，请联系系统管理员或查看日志获取更多信息。
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <ErrorBoundary fallback={fallback} onReset={handleReset}>
      {children}
    </ErrorBoundary>
  );
}