import path from "path"
import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      host: "0.0.0.0",
      allowedHosts: true,
      proxy: {
        // 开发环境下的API代理配置
        '/api': {
          target: env.VITE_API_SERVER || 'http://localhost:8002',
          changeOrigin: true,
          rewrite: (path) => path
        }
      }
    },
    build: {
      // 生产环境构建配置
      outDir: 'dist',
      sourcemap: false,
      // 分割代码块
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom'],
            echarts: ['echarts'],
            shadcn: ['@radix-ui/react-slot']
          }
        }
      }
    }
  }
})
