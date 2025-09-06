import { useEffect, useRef } from 'react';
import { useMonitorStore } from '@/stores/monitor-store';
import { MonitorData } from '@/types/monitor';

export const useWebSocket = (url: string) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const { setCurrentData, addHistoryData, setConnectionStatus } = useMonitorStore();

  const connect = () => {
    try {
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        console.log('WebSocket连接已建立');
        setConnectionStatus(true);
        // 清除重连定时器
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data: MonitorData = JSON.parse(event.data);
          setCurrentData(data);
          addHistoryData(data);
        } catch (error) {
          console.error('解析WebSocket数据失败:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket连接已关闭');
        setConnectionStatus(false);
        // 5秒后尝试重连
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('尝试重新连接WebSocket...');
          connect();
        }, 5000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket连接错误:', error);
        setConnectionStatus(false);
      };
    } catch (error) {
      console.error('创建WebSocket连接失败:', error);
      setConnectionStatus(false);
    }
  };

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [url]);

  return {
    disconnect: () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    },
    reconnect: connect,
  };
};