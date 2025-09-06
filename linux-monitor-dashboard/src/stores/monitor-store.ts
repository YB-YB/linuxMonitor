import { create } from 'zustand'
import { MonitorData, CpuInfo, MemoryInfo } from '../types/monitor'
import { apiService } from '../services/api'
import { wsService } from '../services/websocket'

interface HistoryItem {
  timestamp: number;
}

interface CpuHistoryItem extends HistoryItem {
  usage: number;
}

interface MemoryHistoryItem extends HistoryItem {
  percent: number;
  used: number;
}

interface NetworkHistoryItem extends HistoryItem {
  uploadSpeed: number;
  downloadSpeed: number;
}

interface DiskHistoryItem extends HistoryItem {
  readSpeed: number;
  writeSpeed: number;
  percent: number;
}

interface MonitorStore {
  data: MonitorData | null
  isConnected: boolean
  isLoading: boolean
  error: string | null
  lastUpdate: number
  cpuHistory: CpuHistoryItem[]
  memoryHistory: MemoryHistoryItem[]
  networkHistory: NetworkHistoryItem[]
  diskHistory: DiskHistoryItem[]
  moduleLoadingStates: {
    system: boolean
    cpu: boolean
    memory: boolean
    disk: boolean
    network: boolean
    processes: boolean
  }
  moduleErrors: {
    system: string | null
    cpu: string | null
    memory: string | null
    disk: string | null
    network: string | null
    processes: string | null
  }
  connectionType: 'http' | 'websocket' | 'none'
  setData: (data: MonitorData) => void
  setConnected: (connected: boolean) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setModuleLoading: (module: string, isLoading: boolean) => void
  setModuleError: (module: string, error: string | null) => void
  initializeConnection: () => void
  disconnect: () => void
  retryConnection: () => void
  switchConnectionType: (type: 'http' | 'websocket') => void
}

export const useMonitorStore = create<MonitorStore>((set, get) => ({
  data: null,
  isConnected: false,
  isLoading: false,
  error: null,
  lastUpdate: 0,
  cpuHistory: [],
  memoryHistory: [],
  networkHistory: [],
  diskHistory: [],
  moduleLoadingStates: {
    system: false,
    cpu: false,
    memory: false,
    disk: false,
    network: false,
    processes: false
  },
  moduleErrors: {
    system: null,
    cpu: null,
    memory: null,
    disk: null,
    network: null,
    processes: null
  },
  connectionType: 'websocket', // 默认使用WebSocket连接
  
  setData: (newData) => {
    const now = Date.now();
    
    // 获取当前状态
    const state = get();
    const currentData = state.data || {} as MonitorData;
    
    // 创建一个深拷贝的合并函数，确保对象正确合并
    const deepMerge = (target: any, source: any): any => {
      if (!source) return target;
      if (!target) return source;
      
      const result = { ...target };
      
      Object.keys(source).forEach(key => {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
          result[key] = deepMerge(result[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      });
      
      return result;
    };
    
    // 合并数据，保留现有数据，更新新数据
    // 注意：我们现在按模块接收数据，所以需要更精细地合并
    const mergedData = {
      ...currentData
    } as MonitorData;
    
    // 按模块合并数据，并更新模块加载状态
    if (newData.system) {
      mergedData.system = newData.system;
      set(state => ({
        moduleLoadingStates: { ...state.moduleLoadingStates, system: false },
        moduleErrors: { ...state.moduleErrors, system: null }
      }));
    }
    
    if (newData.cpu) {
      mergedData.cpu = newData.cpu;
      set(state => ({
        moduleLoadingStates: { ...state.moduleLoadingStates, cpu: false },
        moduleErrors: { ...state.moduleErrors, cpu: null }
      }));
    }
    
    if (newData.memory) {
      mergedData.memory = newData.memory;
      set(state => ({
        moduleLoadingStates: { ...state.moduleLoadingStates, memory: false },
        moduleErrors: { ...state.moduleErrors, memory: null }
      }));
    }
    
    if (newData.disk) {
      mergedData.disk = newData.disk;
      set(state => ({
        moduleLoadingStates: { ...state.moduleLoadingStates, disk: false },
        moduleErrors: { ...state.moduleErrors, disk: null }
      }));
    }
    
    if (newData.network) {
      mergedData.network = deepMerge(mergedData.network, newData.network);
      set(state => ({
        moduleLoadingStates: { ...state.moduleLoadingStates, network: false },
        moduleErrors: { ...state.moduleErrors, network: null }
      }));
    }
    
    if (newData.processes) {
      mergedData.processes = newData.processes;
      set(state => ({
        moduleLoadingStates: { ...state.moduleLoadingStates, processes: false },
        moduleErrors: { ...state.moduleErrors, processes: null }
      }));
    }
    
    // 更新当前数据
    set({ 
      data: mergedData, 
      lastUpdate: now, 
      error: null 
    });
    
    console.log('数据已更新:', Object.keys(newData).join(', '));
    
    // 更新历史数据 - 只有在收到相应模块数据时才更新历史记录
    
    // CPU历史数据
    if (newData.cpu) {
      const newCpuHistory = [...state.cpuHistory, {
        timestamp: now,
        usage: newData.cpu.usage
      }];
      
      // 保留最近30个数据点
      if (newCpuHistory.length > 30) {
        newCpuHistory.shift();
      }
      
      set({ cpuHistory: newCpuHistory });
      console.log('CPU历史数据已更新');
    }
    
    // 内存历史数据
    if (newData.memory) {
      const newMemoryHistory = [...state.memoryHistory, {
        timestamp: now,
        percent: newData.memory.percent,
        used: newData.memory.used
      }];
      
      // 保留最近30个数据点
      if (newMemoryHistory.length > 30) {
        newMemoryHistory.shift();
      }
      
      set({ memoryHistory: newMemoryHistory });
      console.log('内存历史数据已更新');
    }
    
    // 网络历史数据
    if (newData.network) {
      const newNetworkHistory = [...state.networkHistory, {
        timestamp: now,
        uploadSpeed: newData.network.uploadSpeed,
        downloadSpeed: newData.network.downloadSpeed
      }];
      
      // 保留最近30个数据点
      if (newNetworkHistory.length > 30) {
        newNetworkHistory.shift();
      }
      
      set({ networkHistory: newNetworkHistory });
      console.log('网络历史数据已更新');
    }
    
    // 磁盘历史数据
    if (newData.disk) {
      const newDiskHistory = [...state.diskHistory, {
        timestamp: now,
        readSpeed: newData.disk.readSpeed,
        writeSpeed: newData.disk.writeSpeed,
        percent: newData.disk.percent
      }];
      
      // 保留最近30个数据点
      if (newDiskHistory.length > 30) {
        newDiskHistory.shift();
      }
      
      set({ diskHistory: newDiskHistory });
      console.log('磁盘历史数据已更新');
    }
  },
  
  setConnected: (isConnected) => set({ isConnected }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  
  setModuleLoading: (module, isLoading) => {
    set(state => ({
      moduleLoadingStates: {
        ...state.moduleLoadingStates,
        [module]: isLoading
      }
    }));
  },
  
  setModuleError: (module, error) => {
    set(state => ({
      moduleErrors: {
        ...state.moduleErrors,
        [module]: error
      }
    }));
  },
  
  initializeConnection: async () => {
    const store = get()
    
    // 如果已经连接，则不重复初始化
    if (store.isConnected) {
      console.log('已经连接，无需重新初始化')
      return
    }
    
    // 设置加载状态
    store.setLoading(true)
    store.setError(null)
    
    // 设置所有模块为加载中状态
    Object.keys(store.moduleLoadingStates).forEach(module => {
      store.setModuleLoading(module, true);
    });
    
    console.log('开始初始化连接...')
    
    // 根据连接类型选择不同的连接方式
    if (store.connectionType === 'websocket') {
      // 使用WebSocket连接
      console.log('使用WebSocket连接...')
      
      // 移除之前的所有事件监听器，避免重复监听
      wsService.off('monitor_data', undefined);
      wsService.off('connection', undefined);
      
      // 设置WebSocket事件监听
      wsService.on('monitor_data', (data) => {
        console.log('收到WebSocket数据:', Object.keys(data))
        store.setData(data)
        store.setConnected(true)
        store.setLoading(false)
      });
      
      wsService.on('connection', (status) => {
        console.log('WebSocket连接状态:', status)
        if (status.status === 'connected') {
          store.setConnected(true)
        } else if (status.status === 'disconnected' || status.status === 'error') {
          store.setConnected(false)
          if (status.status === 'error') {
            store.setError('WebSocket连接错误')
          }
        } else if (status.status === 'failed') {
          store.setConnected(false)
          store.setLoading(false)
          store.setError('WebSocket连接失败，已达到最大重试次数')
        }
      });
      
      // 检查WebSocket是否已连接，避免重复连接
      if (!wsService.isConnected()) {
        // 连接WebSocket
        wsService.connect(
          () => {
            console.log('WebSocket连接成功')
          },
          (error) => {
            console.error('WebSocket连接错误:', error)
            store.setConnected(false)
            store.setLoading(false)
            store.setError('WebSocket连接失败')
            
            // 如果WebSocket连接失败，尝试使用HTTP API
            console.log('尝试使用HTTP API作为备选...')
            store.switchConnectionType('http')
            store.initializeConnection()
          }
        );
      } else {
        console.log('WebSocket已连接，无需重新连接')
        store.setConnected(true)
        store.setLoading(false)
      }
    } else {
      // 使用HTTP API连接
      console.log('使用HTTP API连接...')
      
      // 首先测试API连接
      try {
        const isHealthy = await apiService.testConnection()
        if (!isHealthy) {
          throw new Error('API健康检查失败')
        }
        console.log('API连接测试成功')
      } catch (error) {
        console.error('API连接测试失败:', error)
        store.setConnected(false)
        store.setLoading(false)
        store.setError('无法连接到后端API服务，请检查服务是否正常运行')
        
        // 设置所有模块为错误状态
        Object.keys(store.moduleLoadingStates).forEach(module => {
          store.setModuleLoading(module, false);
          store.setModuleError(module, '连接失败');
        });
        
        return
      }
      
      // 初始化HTTP轮询
      apiService.startPolling(
        (message) => {
          console.log('收到HTTP数据:', message)
          
          // 处理模块级别的数据更新
          if (message.type === 'module_data' && message.module && message.data) {
            console.log(`收到模块数据: ${message.module}`);
            // 创建一个临时对象，只包含当前模块的数据
            const moduleData = {
              [message.module]: message.data
            } as any;
            
            // 更新单个模块的数据
            store.setData(moduleData);
            store.setConnected(true);
            store.setLoading(false);
          }
          // 处理完整的监控数据
          else if (message.type === 'monitor_data' && message.data) {
            store.setData(message.data)
            store.setConnected(true)
            store.setLoading(false)
            
            // 对于未更新的模块，保持其加载状态
            const receivedModules = Object.keys(message.data);
            Object.keys(store.moduleLoadingStates).forEach(module => {
              if (!receivedModules.includes(module)) {
                // 如果这个模块没有在本次更新中收到数据，保持其加载状态
                // 但不要重置已经成功加载的模块
                if (store.moduleLoadingStates[module as keyof typeof store.moduleLoadingStates]) {
                  store.setModuleLoading(module, true);
                }
              }
            });
          }
        },
        (error) => {
          console.error('HTTP API请求错误:', error)
          store.setConnected(false)
          store.setLoading(false)
          store.setError('HTTP API请求失败: ' + error.message)
        }
      )
    }
  },
  
  disconnect: () => {
    const store = get()
    
    if (store.connectionType === 'websocket') {
      wsService.disconnect()
    } else {
      apiService.stopPolling()
    }
    
    set({ isConnected: false })
  },
  
  retryConnection: () => {
    const store = get()
    
    // 如果已经连接，则不需要重试
    if (store.isConnected) {
      console.log('已经连接，无需重试')
      return
    }
    
    console.log('尝试重新连接...')
    
    // 断开现有连接
    if (store.connectionType === 'websocket') {
      wsService.disconnect()
      wsService.resetReconnectAttempts()
    } else {
      apiService.stopPolling()
    }
    
    // 设置状态
    set({ 
      isLoading: true,
      error: null
    })
    
    // 重新初始化连接
    setTimeout(() => {
      store.initializeConnection()
    }, 500) // 添加短暂延迟，避免状态更新冲突
  },
  
  switchConnectionType: (type) => {
    const store = get()
    
    // 如果已经是该类型，则不需要切换
    if (store.connectionType === type) {
      console.log(`已经是${type}连接，无需切换`)
      return
    }
    
    console.log(`切换连接类型: ${store.connectionType} -> ${type}`)
    
    // 断开现有连接
    if (store.connectionType === 'websocket') {
      wsService.disconnect()
    } else if (store.connectionType === 'http') {
      apiService.stopPolling()
    }
    
    // 设置新的连接类型和状态
    set({ 
      connectionType: type,
      isLoading: true,
      error: null,
      isConnected: false
    })
    
    // 重新初始化连接
    setTimeout(() => {
      store.initializeConnection()
    }, 500) // 添加短暂延迟，避免状态更新冲突
  }
}))
