import config from '../config';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

class ApiService {
  private pollingInterval: number | null = null;
  private pollingDelay = config.pollingInterval; // 从配置中获取轮询间隔
  private isRequestPending = false; // 请求锁，防止重复请求
  private pollingCount = 0; // 轮询计数器，用于控制不同数据的获取频率
  private requestTimeouts: Record<string, number> = {}; // 请求超时计时器
  private requestRetries: Record<string, number> = {}; // 请求重试次数
  private maxRetries = config.maxRetries; // 从配置中获取最大重试次数
  private requestTimeout = config.requestTimeout; // 从配置中获取请求超时时间

  // HTTP API调用
  async get<T>(endpoint: string): Promise<T> {
    const requestId = `${endpoint}_${Date.now()}`;
    
    // 重置该端点的重试计数
    if (!this.requestRetries[endpoint]) {
      this.requestRetries[endpoint] = 0;
    }
    
    try {
      // 创建一个可以超时的请求
      const timeoutPromise = new Promise<never>((_, reject) => {
        this.requestTimeouts[requestId] = window.setTimeout(() => {
          reject(new Error(`请求超时: ${endpoint}`));
        }, this.requestTimeout);
      });
      
      // 实际的请求
      const fetchPromise = fetch(`${config.apiBaseUrl}${endpoint}`);
      
      // 使用 Promise.race 实现超时控制
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      
      // 清除超时计时器
      if (this.requestTimeouts[requestId]) {
        clearTimeout(this.requestTimeouts[requestId]);
        delete this.requestTimeouts[requestId];
      }
      
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
      // 清除超时计时器
      if (this.requestTimeouts[requestId]) {
        clearTimeout(this.requestTimeouts[requestId]);
        delete this.requestTimeouts[requestId];
      }
      
      // 增加重试计数
      this.requestRetries[endpoint]++;
      
      console.error(`API调用失败 ${endpoint} (尝试 ${this.requestRetries[endpoint]}/${this.maxRetries}):`, error);
      
      // 如果未超过最大重试次数，则重试
      if (this.requestRetries[endpoint] <= this.maxRetries) {
        console.log(`将在 ${this.requestRetries[endpoint] * 1000}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, this.requestRetries[endpoint] * 1000));
        return this.get(endpoint);
      }
      
      throw error;
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
    // 如果有请求正在进行中，则跳过本次请求
    if (this.isRequestPending) {
      console.log('上一个请求尚未完成，跳过本次请求');
      return;
    }
    
    try {
      this.isRequestPending = true;
      
      // 计算轮询次数
      this.pollingCount = (this.pollingCount || 0) + 1;
      console.log(`第 ${this.pollingCount} 次轮询开始...`);
      
      // 单独获取每个模块的数据，并在获取后立即发送，而不是等待所有数据都获取完毕
      
      // 获取系统信息
      this.getSystemInfo()
        .then(systemInfo => {
          console.log('系统数据获取成功');
          onDataReceived({
            type: 'module_data',
            module: 'system',
            data: systemInfo
          });
        })
        .catch(error => {
          console.error('获取系统数据失败:', error);
          if (onError) {
            onError(new Error('获取系统数据失败: ' + error.message));
          }
        });
      
      // 获取CPU信息
      this.getCpuInfo()
        .then(cpuInfo => {
          console.log('CPU数据获取成功');
          onDataReceived({
            type: 'module_data',
            module: 'cpu',
            data: cpuInfo
          });
        })
        .catch(error => {
          console.error('获取CPU数据失败:', error);
          if (onError) {
            onError(new Error('获取CPU数据失败: ' + error.message));
          }
        });
      
      // 获取内存信息
      this.getMemoryInfo()
        .then(memoryInfo => {
          console.log('内存数据获取成功');
          onDataReceived({
            type: 'module_data',
            module: 'memory',
            data: memoryInfo
          });
        })
        .catch(error => {
          console.error('获取内存数据失败:', error);
          if (onError) {
            onError(new Error('获取内存数据失败: ' + error.message));
          }
        });
      
      // 每隔2次轮询获取磁盘数据（6秒一次）
      if (this.pollingCount % 2 === 0) {
        this.getDiskInfo()
          .then(diskInfo => {
            console.log('磁盘数据获取成功');
            onDataReceived({
              type: 'module_data',
              module: 'disk',
              data: diskInfo
            });
          })
          .catch(error => {
            console.error('获取磁盘数据失败:', error);
            if (onError) {
              onError(new Error('获取磁盘数据失败: ' + error.message));
            }
          });
      }
      
      // 每隔3次轮询获取网络数据（9秒一次）
      if (this.pollingCount % 3 === 0) {
        this.getNetworkInfo()
          .then(networkInfo => {
            console.log('网络数据获取成功');
            onDataReceived({
              type: 'module_data',
              module: 'network',
              data: networkInfo
            });
          })
          .catch(error => {
            console.error('获取网络数据失败:', error);
            if (onError) {
              onError(new Error('获取网络数据失败: ' + error.message));
            }
          });
      }
      
      // 每隔5次轮询获取进程数据（15秒一次）
      if (this.pollingCount % 5 === 0) {
        this.getProcessesInfo()
          .then(processesInfo => {
            console.log('进程数据获取成功');
            onDataReceived({
              type: 'module_data',
              module: 'processes',
              data: processesInfo
            });
          })
          .catch(error => {
            console.error('获取进程数据失败:', error);
            if (onError) {
              onError(new Error('获取进程数据失败: ' + error.message));
            }
          });
      }
      
      console.log(`第 ${this.pollingCount} 次轮询已启动，各模块将独立更新`);
      
      // 设置一个定时器，在所有请求可能完成后重置请求状态
      setTimeout(() => {
        this.isRequestPending = false;
      }, 3000);
      
    } catch (error) {
      console.error('启动数据获取失败:', error);
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
