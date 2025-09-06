export interface SystemInfo {
  hostname: string;
  platform: string;
  uptime: number;
  loadAverage: number[];
  timestamp: number;
}

export interface CpuInfo {
  usage: number;
  cores: number[];
  frequency: number;
  temperature?: number;
  timestamp: number;
}

export interface MemoryInfo {
  total: number;
  used: number;
  available: number;
  percent: number;
  swap: {
    total: number;
    used: number;
    percent: number;
  };
  timestamp: number;
}

export interface DiskInfo {
  total: number;
  used: number;
  free: number;
  percent: number;
  readSpeed: number;
  writeSpeed: number;
  timestamp: number;
}

export interface NetworkInterface {
  name: string;
  isUp: boolean;
  speed: number; // Mbps
  mtu: number;
  ipAddress: string;
  macAddress: string;
  bytesReceived: number;
  bytesSent: number;
  packetsReceived: number;
  packetsSent: number;
  errorsReceived: number;
  errorsSent: number;
}

export interface NetworkConnections {
  tcp: number;
  udp: number;
  tcpListen: number;
  tcpEstablished: number;
  tcpTimeWait: number;
}

export interface OpenPort {
  port: number;
  protocol: 'tcp' | 'udp';
  status: 'listening' | 'established' | 'time_wait';
  process?: string;
  pid?: number;
}

export interface NetworkInfo {
  uploadSpeed: number;
  downloadSpeed: number;
  totalSent: number;
  totalReceived: number;
  connections: NetworkConnections;
  interfaces: NetworkInterface[];
  openPorts: OpenPort[];
  timestamp: number;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  cpuPercent: number;
  memoryPercent: number;
  status: string;
}

export interface MonitorData {
  system: SystemInfo;
  cpu: CpuInfo;
  memory: MemoryInfo;
  disk: DiskInfo;
  network: NetworkInfo;
  processes: ProcessInfo[];
}