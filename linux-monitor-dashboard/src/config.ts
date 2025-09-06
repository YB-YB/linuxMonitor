// 环境配置
interface Config {
  apiBaseUrl: string;
  wsBaseUrl: string;
  pollingInterval: number;
  requestTimeout: number;
  maxRetries: number;
}

// 默认配置
const defaultConfig: Config = {
  apiBaseUrl: 'http://localhost:8002/api/monitor',
  wsBaseUrl: 'ws://localhost:8002/api/monitor/ws',
  pollingInterval: 3000, // 轮询间隔，3秒
  requestTimeout: 5000,  // 请求超时时间，5秒
  maxRetries: 3          // 最大重试次数
};

// 生产环境配置
const productionConfig: Config = {
  // 在生产环境中，使用相对路径，这样会自动使用当前域名
  apiBaseUrl: '/api/monitor',
  wsBaseUrl: `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/monitor/ws`,
  pollingInterval: 3000,
  requestTimeout: 8000,  // 生产环境超时时间稍长
  maxRetries: 3
};

// Docker环境配置
const dockerConfig: Config = {
  apiBaseUrl: '/api/monitor',
  wsBaseUrl: `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/monitor/ws`,
  pollingInterval: 3000,
  requestTimeout: 8000,
  maxRetries: 3
};

// 开发环境配置
const developmentConfig: Config = {
  ...defaultConfig
};

// 根据环境选择配置
const isProduction = import.meta.env.PROD;
const isDocker = import.meta.env.VITE_DOCKER_ENV === 'true';
const config: Config = isDocker ? dockerConfig : (isProduction ? productionConfig : developmentConfig);

// 允许通过环境变量覆盖配置
if (import.meta.env.VITE_API_BASE_URL) {
  config.apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
}

if (import.meta.env.VITE_WS_BASE_URL) {
  if (import.meta.env.VITE_WS_BASE_URL === 'auto') {
    // 自动根据当前域名构建WebSocket URL
    config.wsBaseUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/monitor/ws`;
    console.log('WebSocket URL自动设置为:', config.wsBaseUrl);
  } else {
    config.wsBaseUrl = import.meta.env.VITE_WS_BASE_URL;
  }
}

export default config;