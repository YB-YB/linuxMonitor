import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMonitorStore } from '@/stores/monitor-store';
import { 
  Network, 
  Wifi, 
  WifiOff, 
  Activity, 
  Shield, 
  Server,
  Globe,
  Link,
  Zap
} from 'lucide-react';
import { formatBytes } from '@/utils/format';
import { NetworkInterface, NetworkConnections, OpenPort } from '@/types/monitor';

export function NetworkDetails() {
  const { data } = useMonitorStore();

  // 显示加载中或无数据状态的卡片
  const renderEmptyCard = (message: string) => {
    return (
      <Card className="bg-slate-800/90 backdrop-blur-sm border-slate-700">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-white flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Network className="h-5 w-5 text-blue-400" />
            </div>
            网络详细信息
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-slate-400 py-8">
            {message}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (!data) {
    return renderEmptyCard("暂无监控数据");
  }

  if (!data.network) {
    return renderEmptyCard("暂无网络数据");
  }

  const { network } = data;
  
  // 确保网络数据的完整性
  if (!network.interfaces || !Array.isArray(network.interfaces) || 
      !network.connections || typeof network.connections !== 'object' ||
      !network.openPorts || !Array.isArray(network.openPorts)) {
    return (
      <Card className="bg-slate-800/90 backdrop-blur-sm border-slate-700">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-white flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Network className="h-5 w-5 text-blue-400" />
            </div>
            网络详细信息
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-slate-400 py-8">
            网络数据不完整，请稍后再试
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/90 backdrop-blur-sm border-slate-700 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-white flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Network className="h-5 w-5 text-blue-400" />
          </div>
          网络详细信息
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="interfaces" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-700/50">
            <TabsTrigger value="interfaces" className="data-[state=active]:bg-slate-600">
              网卡信息
            </TabsTrigger>
            <TabsTrigger value="connections" className="data-[state=active]:bg-slate-600">
              连接统计
            </TabsTrigger>
            <TabsTrigger value="ports" className="data-[state=active]:bg-slate-600">
              开放端口
            </TabsTrigger>
          </TabsList>

          {/* 网卡信息 */}
          <TabsContent value="interfaces" className="mt-4">
            <div className="space-y-4">
              {network.interfaces.map((iface, index) => {
                // 确保接口数据有效
                if (!iface || typeof iface !== 'object') return null;
                
                const isUp = iface.isUp !== undefined ? iface.isUp : false;
                const name = iface.name || `网卡${index + 1}`;
                const speed = iface.speed !== undefined ? iface.speed : 0;
                const ipAddress = iface.ipAddress || 'N/A';
                const macAddress = iface.macAddress || 'N/A';
                const mtu = iface.mtu !== undefined ? iface.mtu : 'N/A';
                const bytesReceived = iface.bytesReceived !== undefined ? iface.bytesReceived : 0;
                const bytesSent = iface.bytesSent !== undefined ? iface.bytesSent : 0;
                const packetsReceived = iface.packetsReceived !== undefined ? iface.packetsReceived : 0;
                const packetsSent = iface.packetsSent !== undefined ? iface.packetsSent : 0;
                const errorsReceived = iface.errorsReceived !== undefined ? iface.errorsReceived : 0;
                const errorsSent = iface.errorsSent !== undefined ? iface.errorsSent : 0;
                
                return (
                  <div 
                    key={name || index}
                    className="bg-slate-700/30 rounded-lg p-4 hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {isUp ? (
                          <Wifi className="h-5 w-5 text-green-400" />
                        ) : (
                          <WifiOff className="h-5 w-5 text-red-400" />
                        )}
                        <span className="font-medium text-white">{name}</span>
                        <Badge 
                          variant="outline" 
                          className={`${
                            isUp 
                              ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                              : 'bg-red-500/20 text-red-400 border-red-500/30'
                          }`}
                        >
                          {isUp ? '活跃' : '停用'}
                        </Badge>
                      </div>
                      <div className="text-sm text-slate-400">
                        {speed > 0 ? `${speed} Mbps` : 'N/A'}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-slate-400">IP地址</div>
                        <div className="text-white font-mono">{ipAddress}</div>
                      </div>
                      <div>
                        <div className="text-slate-400">MAC地址</div>
                        <div className="text-white font-mono text-xs">{macAddress}</div>
                      </div>
                      <div>
                        <div className="text-slate-400">MTU</div>
                        <div className="text-white">{mtu}</div>
                      </div>
                      <div>
                        <div className="text-slate-400">状态</div>
                        <div className={`${isUp ? 'text-green-400' : 'text-red-400'}`}>
                          {isUp ? 'UP' : 'DOWN'}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-3 pt-3 border-t border-slate-600 text-sm">
                      <div>
                        <div className="text-slate-400 flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          接收字节
                        </div>
                        <div className="text-blue-400 font-medium">{formatBytes(bytesReceived)}</div>
                      </div>
                      <div>
                        <div className="text-slate-400 flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          发送字节
                        </div>
                        <div className="text-green-400 font-medium">{formatBytes(bytesSent)}</div>
                      </div>
                      <div>
                        <div className="text-slate-400">接收包数</div>
                        <div className="text-white">{isNaN(packetsReceived) ? '0' : packetsReceived.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-slate-400">发送包数</div>
                        <div className="text-white">{isNaN(packetsSent) ? '0' : packetsSent.toLocaleString()}</div>
                      </div>
                    </div>

                    {(errorsReceived > 0 || errorsSent > 0) && (
                      <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-600 text-sm">
                        <div>
                          <div className="text-slate-400">接收错误</div>
                          <div className="text-red-400">{errorsReceived}</div>
                        </div>
                        <div>
                          <div className="text-slate-400">发送错误</div>
                          <div className="text-red-400">{errorsSent}</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* 连接统计 */}
          <TabsContent value="connections" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* TCP连接统计 */}
              <div className="bg-slate-700/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="h-5 w-5 text-blue-400" />
                  <h3 className="font-medium text-white">TCP连接</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">总连接数</span>
                    <span className="text-2xl font-bold text-blue-400">
                      {network.connections.tcp || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">监听状态</span>
                    <span className="text-green-400 font-medium">
                      {network.connections.tcpListen || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">已建立连接</span>
                    <span className="text-yellow-400 font-medium">
                      {network.connections.tcpEstablished || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">等待关闭</span>
                    <span className="text-red-400 font-medium">
                      {network.connections.tcpTimeWait || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* UDP连接统计 */}
              <div className="bg-slate-700/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="h-5 w-5 text-purple-400" />
                  <h3 className="font-medium text-white">UDP连接</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">总连接数</span>
                    <span className="text-2xl font-bold text-purple-400">
                      {network.connections.udp || 0}
                    </span>
                  </div>
                  <div className="text-sm text-slate-400 mt-4">
                    UDP是无连接协议，显示的是当前活跃的UDP套接字数量
                  </div>
                </div>
              </div>
            </div>

            {/* 连接状态分布图 */}
            <div className="mt-6 bg-slate-700/30 rounded-lg p-4">
              <h3 className="font-medium text-white mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-400" />
                连接状态分布
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    <span className="text-slate-300">监听 (LISTEN)</span>
                  </div>
                  <span className="text-green-400 font-medium">{network.connections.tcpListen || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <span className="text-slate-300">已建立 (ESTABLISHED)</span>
                  </div>
                  <span className="text-yellow-400 font-medium">{network.connections.tcpEstablished || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                    <span className="text-slate-300">等待关闭 (TIME_WAIT)</span>
                  </div>
                  <span className="text-red-400 font-medium">{network.connections.tcpTimeWait || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
                    <span className="text-slate-300">UDP套接字</span>
                  </div>
                  <span className="text-purple-400 font-medium">{network.connections.udp || 0}</span>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* 开放端口 */}
          <TabsContent value="ports" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-white flex items-center gap-2">
                  <Shield className="h-5 w-5 text-orange-400" />
                  开放端口列表
                </h3>
                <Badge variant="secondary" className="bg-slate-700 text-slate-300">
                  {network.openPorts?.length || 0} 个端口
                </Badge>
              </div>

              <div className="max-h-80 overflow-y-auto space-y-2">
                {network.openPorts.map((port, index) => {
                  // 确保端口数据有效
                  if (!port || typeof port !== 'object') return null;
                  
                  const portNumber = port.port || '未知';
                  const protocol = port.protocol || 'unknown';
                  const status = port.status || 'unknown';
                  const process = port.process || '';
                  const pid = port.pid;
                  
                  return (
                    <div 
                      key={`${protocol}-${portNumber}-${index}`}
                      className="bg-slate-700/30 rounded-lg p-3 hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Server className="h-4 w-4 text-blue-400" />
                            <span className="font-mono text-white font-medium">
                              {portNumber}
                            </span>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              protocol === 'tcp' 
                                ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                            }`}
                          >
                            {protocol.toUpperCase()}
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              status === 'listening' 
                                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                : status === 'established'
                                ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                : 'bg-red-500/20 text-red-400 border-red-500/30'
                            }`}
                          >
                            {status === 'listening' ? '监听中' : 
                             status === 'established' ? '已连接' : '等待关闭'}
                          </Badge>
                        </div>
                        {process && (
                          <div className="text-right">
                            <div className="text-sm text-white font-medium">{process}</div>
                            {pid && (
                              <div className="text-xs text-slate-400">PID: {pid}</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}