# Linux 系统资源监控前端

这是一个用于监控 Linux 系统资源的前端项目，使用 React、TypeScript 和 Vite 构建。

## 环境配置

项目支持多环境配置，通过不同的环境变量文件来区分不同的部署环境。

### 环境变量文件

- `.env.development` - 开发环境配置
- `.env.production` - 生产环境配置
- `.env.staging` - 测试环境配置

### 环境变量说明

| 变量名 | 说明 | 示例 |
|-------|------|------|
| VITE_API_BASE_URL | 后端 API 基础 URL | http://localhost:8002/api/monitor |
| VITE_WS_BASE_URL | WebSocket 连接 URL | ws://localhost:8002/api/monitor/ws |

## 构建命令

项目提供了多种构建命令，用于不同环境的构建：

```bash
# 开发环境运行
npm run dev

# 默认构建（生产环境）
npm run build

# 指定环境构建
npm run build:dev    # 开发环境构建
npm run build:prod   # 生产环境构建
npm run build:staging # 测试环境构建

# 预览构建结果
npm run preview
```

## 手动指定环境变量

除了使用预定义的环境配置外，还可以在构建时手动指定环境变量：

```bash
# 使用自定义 API 地址构建
VITE_API_BASE_URL=http://custom-api.example.com/api/monitor npm run build
```

## 部署说明

### 生产环境部署

生产环境构建会使用相对路径，自动适应部署域名：

```bash
npm run build:prod
```

构建完成后，将 `dist` 目录下的文件部署到 Web 服务器即可。

### 测试环境部署

```bash
npm run build:staging
```

### 自定义环境部署

1. 创建自定义环境配置文件，例如 `.env.custom`：

```
VITE_API_BASE_URL=http://custom-api.example.com/api/monitor
VITE_WS_BASE_URL=ws://custom-api.example.com/api/monitor/ws
```

2. 使用自定义环境构建：

```bash
vite build --mode custom
```

## 配置系统

项目使用集中式配置管理，配置文件位于 `src/config.ts`。

配置优先级：
1. 环境变量（如 `VITE_API_BASE_URL`）
2. 环境特定配置（如 `productionConfig`）
3. 默认配置（`defaultConfig`）

## 后端代理配置

在开发环境中，可以通过修改 `vite.config.ts` 中的代理配置，将 API 请求代理到后端服务：

```javascript
proxy: {
  '/api': {
    target: 'http://localhost:8002',
    changeOrigin: true,
    rewrite: (path) => path
  }
}