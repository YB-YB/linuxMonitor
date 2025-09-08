import os
import platform
import socket
import time
from typing import Any

import psutil

from ..core.logging_config import get_logger
from ..models.monitor import (
    CpuInfo,
    DiskInfo,
    MemoryInfo,
    MonitorData,
    NetworkConnections,
    NetworkInfo,
    NetworkInterface,
    OpenPort,
    ProcessInfo,
    SystemInfo,
)

# 获取日志记录器
logger = get_logger(__name__)


class MonitorService:
    # 添加类变量来缓存各模块数据
    _cached_system_info = None
    _cached_cpu_info = None
    _cached_memory_info = None
    _cached_disk_info = None
    _cached_network_info = None
    _cached_processes: list[ProcessInfo] = []

    # 记录各模块数据的最后更新时间
    _last_system_update_time = 0
    _last_cpu_update_time = 0
    _last_memory_update_time = 0
    _last_disk_update_time = 0
    _last_network_update_time = 0
    _last_process_update_time = 0

    def __init__(self):
        self.last_network_io = None
        self.last_disk_io = None
        self.last_time = None

        # 配置 psutil 使用宿主机的 /proc 和 /sys 目录
        # 从环境变量中获取路径，如果不存在则使用默认路径
        host_proc = os.environ.get("HOST_PROC", "/proc")
        host_sys = os.environ.get("HOST_SYS", "/sys")

        # 检查是否在 Docker 容器内运行
        self.is_in_docker = os.path.exists("/.dockerenv") or os.path.exists(
            "/run/.containerenv"
        )
        if self.is_in_docker:
            print("检测到在 Docker 容器内运行，将尝试获取宿主机系统信息")

        # 如果目录存在，则尝试配置 psutil 使用这些目录
        if os.path.exists(host_proc):
            try:
                # 尝试设置 PROCFS_PATH
                if hasattr(psutil, "PROCFS_PATH"):
                    psutil.PROCFS_PATH = host_proc
                    logger.info(f"使用宿主机 proc 目录: {host_proc}")
                else:
                    logger.warning(
                        "psutil 不支持 PROCFS_PATH 属性，无法直接设置宿主机 proc 目录"
                    )
            except Exception as e:
                logger.error(f"设置 PROCFS_PATH 时出错: {e}")

        # 记录 sys 目录路径，以便后续手动读取
        self.host_sys_path = host_sys if os.path.exists(host_sys) else None
        if self.host_sys_path:
            logger.info(f"记录宿主机 sys 目录: {self.host_sys_path}")
        else:
            logger.warning(f"宿主机 sys 目录不存在: {host_sys}")

    def get_system_info(self) -> SystemInfo:
        """获取系统基本信息"""
        current_time = time.time()

        try:
            hostname = socket.gethostname()
            platform_info = platform.system()
            uptime = int(time.time() - psutil.boot_time())
            load_avg = (
                psutil.getloadavg()
                if hasattr(psutil, "getloadavg")
                else [0.0, 0.0, 0.0]
            )

            system_info = SystemInfo(
                hostname=hostname,
                platform=platform_info,
                uptime=uptime,
                loadAverage=list(load_avg),
                timestamp=int(current_time * 1000),
            )

            # 更新缓存
            MonitorService._cached_system_info = system_info
            MonitorService._last_system_update_time = current_time

            return system_info
        except Exception as e:
            logger.error(f"获取系统信息失败: {e}")

            # 如果有缓存数据，使用缓存数据
            if MonitorService._cached_system_info:
                logger.info(
                    f"使用缓存的系统信息，缓存时间: {int(current_time - MonitorService._last_system_update_time)}秒前"
                )
                # 更新时间戳
                cached_info = MonitorService._cached_system_info
                # 更新启动时间
                if cached_info.uptime is not None:
                    cached_info.uptime = cached_info.uptime + int(
                        current_time - MonitorService._last_system_update_time
                    )
                cached_info.timestamp = int(current_time * 1000)
                return cached_info

            # 如果没有缓存数据，返回默认值
            return SystemInfo(
                hostname="unknown",
                platform="unknown",
                uptime=0,
                loadAverage=[0.0, 0.0, 0.0],
                timestamp=int(current_time * 1000),
            )

    def get_cpu_info(self) -> CpuInfo:
        """获取CPU信息"""
        current_time = time.time()

        try:
            # 移除interval参数，避免阻塞1秒
            cpu_percent = psutil.cpu_percent(interval=None)
            cpu_cores = psutil.cpu_percent(interval=None, percpu=True)
            cpu_freq = psutil.cpu_freq()
            frequency = cpu_freq.current if cpu_freq else 0

            # 尝试获取CPU温度（Linux系统）
            temperature = None
            try:
                # 检查是否支持获取温度传感器数据
                if platform.system() == "Linux":
                    # 尝试直接从文件读取温度信息
                    temp_files = [
                        "/sys/class/thermal/thermal_zone0/temp",  # 常见的温度文件
                        "/sys/devices/platform/coretemp.0/temp1_input",  # Intel CPU
                        "/sys/class/hwmon/hwmon0/temp1_input",  # 通用路径
                    ]

                    # 如果有宿主机路径，优先使用宿主机路径
                    if hasattr(self, "host_sys_path") and self.host_sys_path:
                        host_temp_files = [
                            f"{self.host_sys_path}/class/thermal/thermal_zone0/temp",
                            f"{self.host_sys_path}/devices/platform/coretemp.0/temp1_input",
                            f"{self.host_sys_path}/class/hwmon/hwmon0/temp1_input",
                        ]
                        temp_files = host_temp_files + temp_files

                    # 尝试读取温度文件
                    for temp_file in temp_files:
                        if os.path.exists(temp_file):
                            try:
                                with open(temp_file, "r") as f:
                                    temp_str = f.read().strip()
                                    # 温度通常以毫摄氏度存储
                                    temp_value = int(temp_str) / 1000.0
                                    if 10 <= temp_value <= 120:  # 合理的温度范围
                                        temperature = temp_value
                                        logger.info(
                                            f"从文件读取CPU温度: {temperature}°C ({temp_file})"
                                        )
                                        break
                            except Exception as e:
                                logger.debug(f"从文件 {temp_file} 读取温度失败: {e}")

                # 如果文件读取失败，尝试使用 psutil（如果支持）
                if temperature is None and hasattr(psutil, "sensors_temperatures"):
                    temps = psutil.sensors_temperatures()
                    if temps and "coretemp" in temps:
                        temperature = temps["coretemp"][0].current
                    elif temps and "cpu_thermal" in temps:
                        temperature = temps["cpu_thermal"][0].current
            except Exception as e:
                print(f"获取CPU温度失败: {e}")
                pass

            cpu_info = CpuInfo(
                usage=cpu_percent,
                cores=cpu_cores,
                frequency=frequency,
                temperature=temperature,
                timestamp=int(current_time * 1000),
            )

            # 更新缓存
            MonitorService._cached_cpu_info = cpu_info
            MonitorService._last_cpu_update_time = current_time

            return cpu_info
        except Exception as e:
            logger.error(f"获取CPU信息失败: {e}")

            # 如果有缓存数据，使用缓存数据
            if MonitorService._cached_cpu_info:
                logger.info(
                    f"使用缓存的CPU信息，缓存时间: {int(current_time - MonitorService._last_cpu_update_time)}秒前"
                )
                # 更新时间戳
                cached_info = MonitorService._cached_cpu_info
                cached_info.timestamp = int(current_time * 1000)
                return cached_info

            # 如果没有缓存数据，返回默认值
            return CpuInfo(
                usage=0.0,
                cores=[0.0],
                frequency=0.0,
                temperature=None,
                timestamp=int(current_time * 1000),
            )

    def get_memory_info(self) -> MemoryInfo:
        """获取内存信息"""
        current_time = time.time()

        try:
            memory = psutil.virtual_memory()
            swap = psutil.swap_memory()

            memory_info = MemoryInfo(
                total=memory.total,
                used=memory.used,
                available=memory.available,
                percent=memory.percent,
                swap={"total": swap.total, "used": swap.used, "percent": swap.percent},
                timestamp=int(current_time * 1000),
            )

            # 更新缓存
            MonitorService._cached_memory_info = memory_info
            MonitorService._last_memory_update_time = current_time

            return memory_info
        except Exception as e:
            logger.error(f"获取内存信息失败: {e}")

            # 如果有缓存数据，使用缓存数据
            if MonitorService._cached_memory_info:
                logger.info(
                    f"使用缓存的内存信息，缓存时间: {int(current_time - MonitorService._last_memory_update_time)}秒前"
                )
                # 更新时间戳
                cached_info = MonitorService._cached_memory_info
                cached_info.timestamp = int(current_time * 1000)
                return cached_info

            # 如果没有缓存数据，返回默认值
            return MemoryInfo(
                total=0,
                used=0,
                available=0,
                percent=0.0,
                swap={"total": 0, "used": 0, "percent": 0.0},
                timestamp=int(current_time * 1000),
            )

    def get_disk_info(self) -> DiskInfo:
        """获取磁盘信息"""
        current_time = time.time()

        try:
            # 获取根分区磁盘使用情况
            disk_usage = psutil.disk_usage("/")

            # 获取磁盘I/O统计
            disk_io = psutil.disk_io_counters()

            read_speed = 0.0
            write_speed = 0.0

            if self.last_disk_io and self.last_time and disk_io:
                time_delta = current_time - self.last_time
                if time_delta > 0:
                    read_speed = (
                        disk_io.read_bytes - self.last_disk_io.read_bytes
                    ) / time_delta
                    write_speed = (
                        disk_io.write_bytes - self.last_disk_io.write_bytes
                    ) / time_delta

            self.last_disk_io = disk_io
            self.last_time = current_time

            disk_info = DiskInfo(
                total=disk_usage.total,
                used=disk_usage.used,
                free=disk_usage.free,
                percent=disk_usage.percent,
                readSpeed=read_speed,
                writeSpeed=write_speed,
                timestamp=int(current_time * 1000),
            )

            # 更新缓存
            MonitorService._cached_disk_info = disk_info
            MonitorService._last_disk_update_time = current_time

            return disk_info
        except Exception as e:
            logger.error(f"获取磁盘信息失败: {e}")

            # 如果有缓存数据，使用缓存数据
            if MonitorService._cached_disk_info:
                logger.info(
                    f"使用缓存的磁盘信息，缓存时间: {int(current_time - MonitorService._last_disk_update_time)}秒前"
                )
                # 更新时间戳
                cached_info = MonitorService._cached_disk_info
                cached_info.timestamp = int(current_time * 1000)
                return cached_info

            # 如果没有缓存数据，返回默认值
            return DiskInfo(
                total=0,
                used=0,
                free=0,
                percent=0.0,
                readSpeed=0.0,
                writeSpeed=0.0,
                timestamp=int(current_time * 1000),
            )

    def get_network_interfaces(self) -> list[NetworkInterface]:
        """获取网络接口信息"""
        interfaces = []
        try:
            # 只获取主要网络接口信息
            net_if_addrs = psutil.net_if_addrs()
            net_if_stats = psutil.net_if_stats()
            net_io_counters = psutil.net_io_counters(pernic=True)

            # 过滤掉虚拟接口和不活跃的接口
            active_interfaces = []
            for interface_name, stats in net_if_stats.items():
                if stats.isup and interface_name in net_io_counters:
                    active_interfaces.append(interface_name)

            # 只处理活跃的接口，最多3个
            for interface_name in active_interfaces[:3]:
                if interface_name in net_if_addrs and interface_name in net_if_stats:
                    addresses = net_if_addrs[interface_name]
                    stats = net_if_stats[interface_name]
                    io_counters = net_io_counters.get(interface_name)

                    # 获取IP和MAC地址
                    ip_address = "N/A"
                    mac_address = "N/A"

                    for addr in addresses:
                        if addr.family == socket.AF_INET:
                            ip_address = addr.address
                        elif addr.family == psutil.AF_LINK:
                            mac_address = addr.address

                    interface = NetworkInterface(
                        name=interface_name,
                        isUp=stats.isup,
                        speed=stats.speed,
                        mtu=stats.mtu,
                        ipAddress=ip_address,
                        macAddress=mac_address,
                        bytesReceived=io_counters.bytes_recv if io_counters else 0,
                        bytesSent=io_counters.bytes_sent if io_counters else 0,
                        packetsReceived=io_counters.packets_recv if io_counters else 0,
                        packetsSent=io_counters.packets_sent if io_counters else 0,
                        errorsReceived=io_counters.errin if io_counters else 0,
                        errorsSent=io_counters.errout if io_counters else 0,
                    )
                    interfaces.append(interface)
        except Exception as e:
            logger.error(f"获取网络接口信息失败: {e}")

        return interfaces

    # 缓存网络连接数据
    _cached_network_connections = NetworkConnections(
        tcp=0, udp=0, tcpListen=0, tcpEstablished=0, tcpTimeWait=0
    )
    _last_connections_update_time = 0

    def get_network_connections(self) -> NetworkConnections:
        """获取网络连接统计"""
        current_time = time.time()

        try:
            # 尝试获取实际的网络连接数据
            connections = psutil.net_connections()

            # 统计各类连接数量
            tcp_count = 0
            udp_count = 0
            tcp_listen_count = 0
            tcp_established_count = 0
            tcp_time_wait_count = 0

            for conn in connections:
                if conn.type == socket.SOCK_STREAM:  # TCP
                    tcp_count += 1
                    if conn.status == "LISTEN":
                        tcp_listen_count += 1
                    elif conn.status == "ESTABLISHED":
                        tcp_established_count += 1
                    elif conn.status == "TIME_WAIT":
                        tcp_time_wait_count += 1
                elif conn.type == socket.SOCK_DGRAM:  # UDP
                    udp_count += 1

            network_connections = NetworkConnections(
                tcp=tcp_count,
                udp=udp_count,
                tcpListen=tcp_listen_count,
                tcpEstablished=tcp_established_count,
                tcpTimeWait=tcp_time_wait_count,
            )

            # 更新缓存
            MonitorService._cached_network_connections = network_connections
            MonitorService._last_connections_update_time = current_time

            return network_connections
        except Exception as e:
            logger.error(f"获取网络连接统计失败: {e}")

            # 如果有缓存数据，使用缓存数据
            if MonitorService._cached_network_connections:
                logger.info(
                    f"使用缓存的网络连接数据，缓存时间: {int(current_time - MonitorService._last_connections_update_time)}秒前"
                )
                return MonitorService._cached_network_connections

            # 如果没有缓存数据，返回默认值
            return NetworkConnections(
                tcp=0, udp=0, tcpListen=0, tcpEstablished=0, tcpTimeWait=0
            )

    # 缓存开放端口数据
    _cached_open_ports: list[OpenPort] = []
    _last_ports_update_time = 0

    def get_open_ports(self) -> list[OpenPort]:
        """获取开放端口列表"""
        current_time = time.time()

        try:
            # 尝试获取实际的开放端口数据
            # 这里使用 psutil 的 net_connections 方法获取网络连接信息
            open_ports = []

            try:
                # 注意：这个操作可能需要管理员权限
                connections = psutil.net_connections()

                # 过滤出监听状态的连接
                listening_connections = [
                    conn for conn in connections if conn.status == "LISTEN"
                ]

                # 转换为 OpenPort 对象
                for conn in listening_connections:
                    try:
                        # 安全地获取端口号
                        port: int = 0
                        try:
                            if hasattr(conn.laddr, 'port'):
                                # 使用 getattr 来避免类型检查器的警告
                                port_value = getattr(conn.laddr, 'port', None)
                                if port_value is not None:
                                    port = int(port_value)
                                else:
                                    continue
                            elif isinstance(conn.laddr, tuple) and len(conn.laddr) >= 2:
                                port = int(conn.laddr[1])
                            else:
                                continue  # 跳过无法获取端口的连接
                        except (ValueError, TypeError, AttributeError):
                            continue  # 跳过无法解析端口的连接
                            
                        protocol = "tcp"  # psutil 主要返回 TCP 连接
                        status = "listening"

                        # 尝试获取进程信息
                        process_name = "unknown"
                        pid = conn.pid

                        if pid:
                            try:
                                process = psutil.Process(pid)
                                process_name = process.name()
                            except (psutil.NoSuchProcess, psutil.AccessDenied):
                                pass

                        open_port = OpenPort(
                            port=port,
                            protocol=protocol,
                            status=status,
                            process=process_name,
                            pid=pid or 0,
                        )
                        open_ports.append(open_port)
                    except Exception as e:
                        logger.debug(f"处理端口信息失败: {e}")
                        continue
            except (psutil.AccessDenied, PermissionError) as e:
                logger.warning(f"获取网络连接信息失败，可能需要管理员权限: {e}")
                raise

            # 如果成功获取了端口数据，更新缓存
            if open_ports:
                MonitorService._cached_open_ports = open_ports
                MonitorService._last_ports_update_time = current_time
                return open_ports
            else:
                raise Exception("未获取到开放端口数据")

        except Exception as e:
            logger.error(f"获取开放端口列表失败: {e}")

            # 如果有缓存数据，使用缓存数据
            if MonitorService._cached_open_ports:
                logger.info(
                    f"使用缓存的开放端口数据，共 {len(MonitorService._cached_open_ports)} 个端口，"
                    f"缓存时间: {int(current_time - MonitorService._last_ports_update_time)}秒前"
                )
                return MonitorService._cached_open_ports

            # 如果没有缓存数据，返回空列表
            return []

    def get_network_info(self) -> NetworkInfo:
        """获取网络信息"""
        current_time = time.time()

        try:
            # 获取网络I/O统计
            net_io = psutil.net_io_counters()

            upload_speed = 0.0
            download_speed = 0.0

            if self.last_network_io and self.last_time:
                time_delta = current_time - self.last_time
                if time_delta > 0:
                    upload_speed = (
                        net_io.bytes_sent - self.last_network_io.bytes_sent
                    ) / time_delta
                    download_speed = (
                        net_io.bytes_recv - self.last_network_io.bytes_recv
                    ) / time_delta

            self.last_network_io = net_io

            # 获取网络接口、连接统计和开放端口
            interfaces = self.get_network_interfaces()
            connections = self.get_network_connections()
            open_ports = self.get_open_ports()

            network_info = NetworkInfo(
                uploadSpeed=upload_speed,
                downloadSpeed=download_speed,
                totalSent=net_io.bytes_sent,
                totalReceived=net_io.bytes_recv,
                connections=connections,
                interfaces=interfaces,
                openPorts=open_ports,
                timestamp=int(current_time * 1000),
            )

            # 更新缓存
            MonitorService._cached_network_info = network_info
            MonitorService._last_network_update_time = current_time

            return network_info
        except Exception as e:
            logger.error(f"获取网络信息失败: {e}")

            # 如果有缓存数据，使用缓存数据
            if MonitorService._cached_network_info:
                logger.info(
                    f"使用缓存的网络信息，缓存时间: {int(current_time - MonitorService._last_network_update_time)}秒前"
                )
                # 更新时间戳
                cached_info = MonitorService._cached_network_info
                cached_info.timestamp = int(current_time * 1000)
                return cached_info

            # 如果没有缓存数据，返回默认值
            return NetworkInfo(
                uploadSpeed=0.0,
                downloadSpeed=0.0,
                totalSent=0,
                totalReceived=0,
                connections=NetworkConnections(
                    tcp=0, udp=0, tcpListen=0, tcpEstablished=0, tcpTimeWait=0
                ),
                interfaces=[],
                openPorts=[],
                timestamp=int(current_time * 1000),
            )

    # 添加类变量来缓存进程数据
    _cached_processes: list[ProcessInfo] = []
    _last_process_update_time = 0

    def get_processes_info(self) -> list[ProcessInfo]:
        """获取进程信息"""
        current_time = time.time()
        processes = []

        try:
            # 先获取所有进程对象
            all_processes = list(psutil.process_iter())

            # 第一次获取CPU使用率，这会初始化CPU计数器
            for proc in all_processes:
                try:
                    proc.cpu_percent(interval=0)
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass

            # 等待一小段时间，让CPU使用率计算有意义
            time.sleep(0.1)

            # 再次获取进程信息，这次CPU使用率将会有实际值
            for proc in all_processes[:30]:  # 限制只处理前30个进程
                try:
                    # 获取进程详细信息
                    pid = proc.pid
                    name = proc.name()
                    cpu_percent = proc.cpu_percent(
                        interval=0
                    )  # 不再等待，使用之前初始化的值
                    memory_percent = proc.memory_percent()
                    status = proc.status()

                    process_info = ProcessInfo(
                        pid=pid,
                        name=name,
                        cpuPercent=cpu_percent or 0.0,
                        memoryPercent=memory_percent or 0.0,
                        status=status,
                    )
                    processes.append(process_info)
                except (
                    psutil.NoSuchProcess,
                    psutil.AccessDenied,
                    psutil.ZombieProcess,
                ):
                    continue

            # 按CPU使用率排序
            processes.sort(key=lambda p: p.cpuPercent, reverse=True)

            # 如果成功获取了进程数据，更新缓存
            if processes:
                MonitorService._cached_processes = processes
                MonitorService._last_process_update_time = current_time
                logger.info(f"进程数据已更新，缓存了 {len(processes)} 个进程")
            else:
                logger.warning("获取进程数据失败，进程列表为空")
                # 如果有缓存数据，使用缓存数据
                if MonitorService._cached_processes:
                    logger.info(
                        f"使用缓存的进程数据，共 {len(MonitorService._cached_processes)} 个进程，"
                        f"缓存时间: {int(current_time - MonitorService._last_process_update_time)}秒前"
                    )
                    processes = MonitorService._cached_processes
        except Exception as e:
            logger.error(f"获取进程信息失败: {e}")
            # 如果有缓存数据，使用缓存数据
            if MonitorService._cached_processes:
                logger.info(
                    f"使用缓存的进程数据，共 {len(MonitorService._cached_processes)} 个进程，"
                    f"缓存时间: {int(current_time - MonitorService._last_process_update_time)}秒前"
                )
                processes = MonitorService._cached_processes

        return processes

    def get_all_monitor_data(self) -> MonitorData:
        """获取所有监控数据"""
        # 获取基本监控数据
        system_info = self.get_system_info()
        cpu_info = self.get_cpu_info()
        memory_info = self.get_memory_info()
        disk_info = self.get_disk_info()

        # 优化网络信息获取，减少数据量
        network_info = self.get_network_info()

        # 限制进程数量，只返回前10个CPU使用率最高的进程
        processes = self.get_processes_info()
        processes.sort(key=lambda p: p.cpuPercent, reverse=True)
        top_processes = processes[:10]

        # 限制网络接口数量
        if len(network_info.interfaces) > 2:
            network_info.interfaces = network_info.interfaces[:2]

        # 限制开放端口数量
        if len(network_info.openPorts) > 5:
            network_info.openPorts = network_info.openPorts[:5]

        return MonitorData(
            system=system_info,
            cpu=cpu_info,
            memory=memory_info,
            disk=disk_info,
            network=network_info,
            processes=top_processes,
        )
