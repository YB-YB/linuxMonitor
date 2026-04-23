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
    const state = get();
    const currentData = state.data || {} as MonitorData;
    
    const mergedData = { ...currentData } as MonitorData;
    
    // 按模块合并数据，并更新模块加载状态
    if (newData.system) {
      mergedData.system = newData.system;
      set(s => ({
        moduleLoadingStates: { ...s.moduleLoadingStates, system: false },
        moduleErrors: { ...s.moduleErrors, system: null }
      }));
    }
    
    if (newData.cpu) {
      mergedData.cpu = newData.cpu;
      set(s => ({
        moduleLoadingStates: { ...s.moduleLoadingStates, cpu: false },
        moduleErrors: { ...s.moduleErrors, cpu: null }
      }));
    }
    
    if (newData.memory) {
      mergedData.memory = newData.memory;
      set(s => ({
        moduleLoadingStates: { ...s.moduleLoadingStates, memory: false },
        moduleErrors: { ...s.moduleErrors, memory: null }
      }));
    }
    
    if (newData.disk) {
      mergedData.disk = newData.disk;
      set(s => ({
        moduleLoadingStates: { ...s.moduleLoadingStates, disk: false },
        moduleErrors: { ...s.moduleErrors, disk: null }
      }));
    }
    
    if (newData.network) {
      mergedData.network = newData.network;
      set(s => ({
        moduleLoadingStates: { ...s.moduleLoadingStates, network: false },
        moduleErrors: { ...s.moduleErrors, network: null }
      }));
    }
    
    if (newData.processes) {
      mergedData.processes = newData.processes;
      set(s => ({
        moduleLoadingStates: { ...s.moduleLoadingStates, processes: false },
        moduleErrors: { ...s.moduleErrors, processes: null }
      }));
    }
    
    set({ data: mergedData, lastUpdate: now, error: null });
    
    // 更新历史数据
    if (newData.cpu) {
      const newCpuHistory = [...state.cpuHistory, {
        timestamp: now,
        usage: newData.cpu.usage
      }];
      if (newCpuHistory.length > 30) {
        newCpuHistory.shift();
      }
      set({ cpuHistory: newCpuHistory });
    }
    
    if (newData.memory) {
      const newMemoryHistory = [...state.memoryHistory, {
        timestamp: now,
        percent: newData.memory.percent,
        used: newData.memory.used
      }];
      if (newMemoryHistory.length > 30) {
        newMemoryHistory.shift();
      }
      set({ memoryHistory: newMemoryHistory });
    }
    
    if (newData.network) {
      const newNetworkHistory = [...state.networkHistory, {
        timestamp: now,
        uploadSpeed: newData.network.uploadSpeed,
        downloadSpeed: newData.network.downloadSpeed
      }];
      if (newNetworkHistory.length > 30) {
        newNetworkHistory.shift();
      }
      set({ networkHistory: newNetworkHistory });
    }
    
    if (newData.disk) {
      const newDiskHistory = [...state.diskHistory, {
        timestamp: now,
        readSpeed: newData.disk.readSpeed,
        writeSpeed: newData.disk.writeSpeed,
        percent: newData.disk.percent
      }];
      if (newDiskHistory.length > 30) {
        newDiskHistory.shift();
      }
      set({ diskHistory: newDiskHistory });
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
