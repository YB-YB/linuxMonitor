import config from '../config';

export interface WebSocketMessage {
  type: string;
  data: any;
}

class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: number | null = null;
  private reconnectInterval = 3000; // 重连间隔，3秒
  private listeners: { [key: string]: ((data: any) => void)[] } = {};
  private isConnecting = false;

  // 连接WebSocket
  connect(onOpen?: () => void, onError?: (error: Event) => void): void {
    // 如果已经连接或正在连接，则不重复连接
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      console.log('WebSocket已经连接或正在连接中');
      if (this.socket.readyState === WebSocket.OPEN && onOpen) {
        // 如果已经连接成功，直接调用onOpen回调
        onOpen();
      }
      return;
    }

    if (this.isConnecting) {
      console.log('WebSocket正在连接中，请勿重复连接');
      return;
    }

    this.isConnecting = true;
    console.log('正在连接WebSocket...');
    
    // 设置连接超时
    const connectionTimeout = window.setTimeout(() => {
      if (this.isConnecting && (!this.socket || this.socket.readyState !== WebSocket.OPEN)) {
        console.error('WebSocket连接超时');
        this.isConnecting = false;
        
        // 如果socket已创建但未连接成功，关闭它
        if (this.socket) {
          this.socket.close();
          this.socket = null;
        }
        
        if (onError) onError(new Event('timeout'));
        this.emit('connection', { status: 'error', error: 'connection timeout' });
        this.attemptReconnect();
      }
    }, 5000); // 5秒超时

    try {
      // 记录连接时间，用于调试
      const connectStartTime = Date.now();
      console.log(`开始连接WebSocket: ${config.wsBaseUrl} 时间: ${new Date().toISOString()}`);
      
      this.socket = new WebSocket(config.wsBaseUrl);

      this.socket.onopen = () => {
        // 清除连接超时
        clearTimeout(connectionTimeout);
        
        const connectTime = Date.now() - connectStartTime;
        console.log(`WebSocket连接成功，耗时: ${connectTime}ms`);
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        if (onOpen) onOpen();
        this.emit('connection', { status: 'connected' });
      };

      this.socket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          // 减少日志输出，避免控制台被刷屏
          if (message.type !== 'monitor_data') {
            console.log('收到WebSocket消息:', message.type);
          }
          this.emit(message.type, message.data);
        } catch (error) {
          console.error('解析WebSocket消息失败:', error);
        }
      };

      this.socket.onclose = (event) => {
        // 清除连接超时
        clearTimeout(connectionTimeout);
        
        console.log(`WebSocket连接关闭: ${event.code} ${event.reason}`);
        this.isConnecting = false;
        this.socket = null;
        this.emit('connection', { status: 'disconnected', code: event.code, reason: event.reason });
        
        // 只有在非正常关闭时才尝试重连
        if (event.code !== 1000) {
          this.attemptReconnect();
        }
      };

      this.socket.onerror = (error) => {
        // 清除连接超时
        clearTimeout(connectionTimeout);
        
        console.error('WebSocket连接错误:', error);
        this.isConnecting = false;
        if (onError) onError(error);
        this.emit('connection', { status: 'error', error });
      };
    } catch (error) {
      // 清除连接超时
      clearTimeout(connectionTimeout);
      
      console.error('创建WebSocket连接失败:', error);
      this.isConnecting = false;
      if (onError) onError(error as Event);
      this.emit('connection', { status: 'error', error });
      this.attemptReconnect();
    }
  }

  // 尝试重新连接
  private attemptReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`尝试重新连接 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      this.reconnectTimeout = window.setTimeout(() => {
        this.connect();
      }, this.reconnectInterval * this.reconnectAttempts);
    } else {
      console.error('达到最大重连次数，停止重连');
      this.emit('connection', { status: 'failed' });
    }
  }

  // 断开WebSocket连接
  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.reconnectAttempts = 0;
    console.log('WebSocket连接已断开');
  }

  // 添加事件监听器
  on(event: string, callback: (data: any) => void): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  // 移除事件监听器
  off(event: string, callback?: (data: any) => void): void {
    if (!this.listeners[event]) {
      return;
    }
    
    if (callback) {
      // 移除特定回调
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    } else {
      // 移除所有该事件的回调
      delete this.listeners[event];
    }
  }

  // 触发事件
  private emit(event: string, data: any): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`执行${event}事件回调时出错:`, error);
        }
      });
    }
  }

  // 检查连接状态
  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  // 重置重连尝试次数
  resetReconnectAttempts(): void {
    this.reconnectAttempts = 0;
  }
}

export const wsService = new WebSocketService();