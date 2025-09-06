import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

/**
 * 测试错误边界组件
 * 用于测试错误边界是否正常工作
 */
export function TestError() {
  const [shouldError, setShouldError] = useState(false);

  // 触发渲染错误
  if (shouldError) {
    throw new Error('这是一个测试错误，用于验证错误边界是否正常工作');
  }

  return (
    <Card className="bg-slate-800/90 backdrop-blur-sm border-yellow-700/50">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-white flex items-center gap-3">
          <div className="p-2 bg-yellow-500/20 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
          </div>
          错误边界测试
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-slate-300 mb-4">
          点击下方按钮触发一个渲染错误，测试错误边界组件是否正常工作。
        </p>
        <Button 
          variant="destructive" 
          onClick={() => setShouldError(true)}
        >
          触发错误
        </Button>
      </CardContent>
    </Card>
  );
}