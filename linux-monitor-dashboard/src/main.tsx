import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './globals.css'
import { GlobalErrorBoundary } from './components/global-error-boundary'

// 添加全局错误处理
const handleGlobalError = (event: ErrorEvent) => {
  console.error('全局错误:', event.error);
  // 可以在这里添加错误上报逻辑
  event.preventDefault();
};

// 添加未捕获的Promise错误处理
const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
  console.error('未处理的Promise错误:', event.reason);
  // 可以在这里添加错误上报逻辑
  event.preventDefault();
};

// 注册全局错误处理器
window.addEventListener('error', handleGlobalError);
window.addEventListener('unhandledrejection', handleUnhandledRejection);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </StrictMode>,
)
