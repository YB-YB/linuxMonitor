from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class SystemInfo(BaseModel):
    hostname: str
    platform: str
    uptime: int
    loadAverage: List[float]
    timestamp: int


class CpuInfo(BaseModel):
    usage: float
    cores: List[float]
    frequency: float
    temperature: Optional[float] = None
    timestamp: int


class MemoryInfo(BaseModel):
    total: int
    used: int
    available: int
    percent: float
    swap: dict
    timestamp: int


class DiskInfo(BaseModel):
    total: int
    used: int
    free: int
    percent: float
    readSpeed: float
    writeSpeed: float
    timestamp: int


class NetworkInterface(BaseModel):
    name: str
    isUp: bool
    speed: int
    mtu: int
    ipAddress: str
    macAddress: str
    bytesReceived: int
    bytesSent: int
    packetsReceived: int
    packetsSent: int
    errorsReceived: int
    errorsSent: int


class NetworkConnections(BaseModel):
    tcp: int
    udp: int
    tcpListen: int
    tcpEstablished: int
    tcpTimeWait: int


class OpenPort(BaseModel):
    port: int
    protocol: str
    status: str
    process: Optional[str] = None
    pid: Optional[int] = None


class NetworkInfo(BaseModel):
    uploadSpeed: float
    downloadSpeed: float
    totalSent: int
    totalReceived: int
    connections: NetworkConnections
    interfaces: List[NetworkInterface]
    openPorts: List[OpenPort]
    timestamp: int


class ProcessInfo(BaseModel):
    pid: int
    name: str
    cpuPercent: float
    memoryPercent: float
    status: str


class MonitorData(BaseModel):
    system: SystemInfo
    cpu: CpuInfo
    memory: MemoryInfo
    disk: DiskInfo
    network: NetworkInfo
    processes: List[ProcessInfo]
