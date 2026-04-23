import config from '../config';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

class ApiService {
  private pollingInterval: number | null = null;
  private pollingDelay = config.pollingInterval;
  private isRequestPending = false;
  private pollingCount = 0;
  private requestRetries: Record<string, number> = {};
  private maxRetries = config.maxRetries;
  private requestTimeout = config.requestTimeout;

  // HTTP API调用
  async get<T>(endpoint: string): Promise<T> {
    const requestId = `${endpoint}_${Date.now()}`;
    
    // 重置该端点的重试计数
    if (!this.requestRetries[endpoint]) {
      this.requestRetries[endpoint] = 0;
    }
    
    let timeoutId: number | undefined;
    
    try {
      // 创建一个可以超时的请求
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(() => {
          reject(new Error(`请求超时: ${endpoint}`));
        }, this.requestTimeout);
      });
      
      // 实际的请求
      const fetchPromise = fetch(`${config.apiBaseUrl}${endpoint}`);
      
      // 使用 Promise.race 实现超时控制
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: ApiResponse<T> = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'API调用失败');
      }
      
      // 成功后重置重试计数
      this.requestRetries[endpoint] = 0;
      
      return result.data;
    } catch (error) {
      // 增加重试计数
      this.requestRetries[endpoint]++;
      
      console.error(`API调用失败 ${endpoint} (尝试 ${this.requestRetries[endpoint]}/${this.maxRetries}):`, error);
      
      // 如果未超过最大重试次数，则重试
      if (this.requestRetries[endpoint] <= this.maxRetries) {
        await new Promise(resolve => setTimeout(resolve, this.requestRetries[endpoint] * 1000));
        return this.get(endpoint);
      }
      
      throw error;
    } finally {
      // 确保超时计时器被清理
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  // 废弃 - 不再使用 /all 接口
  // async getAllMonitorData() {
  //   return this.get('/all');
  // }

  // 获取系统信息
  async getSystemInfo() {
    return this.get('/system');
  }

  // 获取CPU信息
  async getCpuInfo() {
    return this.get('/cpu');
  }

  // 获取内存信息
  async getMemoryInfo() {
    return this.get('/memory');
  }

  // 获取磁盘信息
  async getDiskInfo() {
    return this.get('/disk');
  }

  // 获取网络信息
  async getNetworkInfo() {
    return this.get('/network');
  }

  // 获取进程信息
  async getProcessesInfo() {
    return this.get('/processes');
  }

  // 开始HTTP轮询
  startPolling(onDataReceived: (data: any) => void, onError?: (error: Error) => void) {
    if (this.pollingInterval) {
      console.log('HTTP轮询已经启动，无需重新启动');
      return;
    }

    console.log(`启动HTTP轮询，间隔: ${this.pollingDelay}ms (${this.pollingDelay/1000}秒)`);
    
    // 重置轮询计数器
    this.pollingCount = 0;
    
    // 立即执行一次数据获取
    this.fetchData(onDataReceived, onError);
    
    // 设置定时器定期获取数据
    this.pollingInterval = window.setInterval(() => {
      console.log(`定时器触发，准备执行第 ${this.pollingCount + 1} 次轮询...`);
      // 只有当前没有请求正在进行时才发起新请求
      if (!this.isRequestPending) {
        this.fetchData(onDataReceived, onError);
      } else {
        console.log('上一个请求尚未完成，跳过本次轮询');
      }
    }, this.pollingDelay);
    
    return () => this.stopPolling();
  }
  
  // 停止HTTP轮询
  stopPolling() {
    if (this.pollingInterval) {
      console.log('停止HTTP轮询');
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      this.pollingCount = 0;
      this.isRequestPending = false;
    }
  }
  
  // 获取数据的具体实现 - 按调度规则分别调用接口，并单独更新每个模块
  private async fetchData(onDataReceived: (data: any) => void, onError?: (error: Error) => void) {
    if (this.isRequestPending) {
      return;
    }
    
    try {
      this.isRequestPending = true;
      this.pollingCount = (this.pollingCount || 0) + 1;
      
      // 并行获取高频数据（系统、CPU、内存）
      const fetchWithCallback = <T>(
        fetchFn: () => Promise<T>,
        module: string,
        successMsg: string,
        errorMsg: string
      ) => {
        fetchFn()
          .then(data => {
            onDataReceived({ type: 'module_data', module, data });
          })
          .catch(error => {
            if (onError) {
              onError(new Error(`${errorMsg}: ${error.message}`));
            }
          });
      };

      fetchWithCallback(() => this.getSystemInfo(), 'system', '系统数据获取成功', '获取系统数据失败');
      fetchWithCallback(() => this.getCpuInfo(), 'cpu', 'CPU数据获取成功', '获取CPU数据失败');
      fetchWithCallback(() => this.getMemoryInfo(), 'memory', '内存数据获取成功', '获取内存数据失败');
      
      // 每隔2次轮询获取磁盘数据（6秒一次）
      if (this.pollingCount % 2 === 0) {
        fetchWithCallback(() => this.getDiskInfo(), 'disk', '磁盘数据获取成功', '获取磁盘数据失败');
      }
      
      // 每隔3次轮询获取网络数据（9秒一次）
      if (this.pollingCount % 3 === 0) {
        fetchWithCallback(() => this.getNetworkInfo(), 'network', '网络数据获取成功', '获取网络数据失败');
      }
      
      // 每隔5次轮询获取进程数据（15秒一次）
      if (this.pollingCount % 5 === 0) {
        fetchWithCallback(() => this.getProcessesInfo(), 'processes', '进程数据获取成功', '获取进程数据失败');
      }
      
      // 等待足够时间后重置请求锁，确保所有异步请求有足够时间完成
      setTimeout(() => {
        this.isRequestPending = false;
      }, this.requestTimeout + 1000);
      
    } catch (error) {
      if (onError) {
        onError(error as Error);
      }
      this.isRequestPending = false;
    }
  }

  // 设置轮询间隔
  setPollingDelay(delay: number) {
    this.pollingDelay = delay;
    // 如果轮询已经启动，重新启动以应用新的间隔
    if (this.pollingInterval) {
      this.stopPolling();
      this.startPolling((data) => {
        // 这里需要外部重新调用startPolling来设置新的回调
        console.log('轮询间隔已更新，请重新启动轮询');
      });
    }
  }

  // 检查API服务状态
  async checkHealth(): Promise<boolean> {
    try {
      // 从配置的 apiBaseUrl 中提取基础URL
      const baseUrl = config.apiBaseUrl.split('/api/monitor')[0];
      const response = await fetch(`${baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  // 简化的连接测试 - 测试系统信息接口
  async testConnection(): Promise<boolean> {
    try {
      console.log('测试API连接...');
      const response = await fetch(`${config.apiBaseUrl}/system`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
      console.log('API连接测试成功:', result);
      return result.success === true;
    } catch (error) {
      console.error('API连接测试失败:', error);
      return false;
    }
  }
}

export const apiService = new ApiService();
