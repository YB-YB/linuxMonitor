import asyncio
import json
import time

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse

from app.core.logging_config import get_logger
from app.models.monitor import MonitorData
from app.services.monitor_service import MonitorService

# 获取日志记录器
logger = get_logger(__name__)

router = APIRouter()
monitor_service = MonitorService()


# WebSocket连接管理器
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        try:
            await websocket.accept()
            self.active_connections.append(websocket)
            logger.info(
                f"WebSocket连接已建立，当前连接数: {len(self.active_connections)}"
            )
        except Exception as e:
            logger.error(f"WebSocket连接建立失败: {e}")
            # 不要添加到活跃连接列表中

    def disconnect(self, websocket: WebSocket):
        try:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)
            logger.info(
                f"WebSocket连接已断开，当前连接数: {len(self.active_connections)}"
            )
        except Exception as e:
            logger.error(f"WebSocket断开连接失败: {e}")

    async def send_personal_message(self, message: str, websocket: WebSocket):
        try:
            # 检查连接是否仍然活跃
            if websocket.client_state.name == "CONNECTED":
                await websocket.send_text(message)
            else:
                logger.warning("尝试向已断开的连接发送消息")
                self.disconnect(websocket)
        except Exception as e:
            logger.error(f"发送消息失败: {e}")
            try:
                self.disconnect(websocket)
            except Exception as disconnect_error:
                logger.error(f"断开连接失败: {disconnect_error}")

    async def broadcast(self, message: str):
        disconnected = []
        for connection in self.active_connections[:]:  # 创建副本以避免迭代时修改
            try:
                # 检查连接是否仍然活跃
                if connection.client_state.name == "CONNECTED":
                    await connection.send_text(message)
                else:
                    logger.warning("尝试向已断开的连接广播消息")
                    disconnected.append(connection)
            except Exception as e:
                logger.error(f"广播消息失败: {e}")
                disconnected.append(connection)

        # 清理断开的连接
        for conn in disconnected:
            try:
                self.disconnect(conn)
            except Exception as e:
                logger.error(f"清理断开连接失败: {e}")


manager = ConnectionManager()


@router.get("/system", response_model=dict)
async def get_system_info():
    """获取系统基本信息"""
    try:
        system_info = monitor_service.get_system_info()
        return {"success": True, "data": system_info.dict()}
    except Exception as e:
        logger.error(f"获取系统信息失败: {e}")
        return JSONResponse(
            status_code=500, content={"success": False, "error": str(e)}
        )


@router.get("/cpu", response_model=dict)
async def get_cpu_info():
    """获取CPU信息"""
    try:
        cpu_info = monitor_service.get_cpu_info()
        return {"success": True, "data": cpu_info.dict()}
    except Exception as e:
        logger.error(f"获取CPU信息失败: {e}")
        return JSONResponse(
            status_code=500, content={"success": False, "error": str(e)}
        )


@router.get("/memory", response_model=dict)
async def get_memory_info():
    """获取内存信息"""
    try:
        memory_info = monitor_service.get_memory_info()
        return {"success": True, "data": memory_info.dict()}
    except Exception as e:
        logger.error(f"获取内存信息失败: {e}")
        return JSONResponse(
            status_code=500, content={"success": False, "error": str(e)}
        )


@router.get("/disk", response_model=dict)
async def get_disk_info():
    """获取磁盘信息"""
    try:
        disk_info = monitor_service.get_disk_info()
        return {"success": True, "data": disk_info.dict()}
    except Exception as e:
        logger.error(f"获取磁盘信息失败: {e}")
        return JSONResponse(
            status_code=500, content={"success": False, "error": str(e)}
        )


@router.get("/network", response_model=dict)
async def get_network_info():
    """获取网络信息"""
    try:
        network_info = monitor_service.get_network_info()
        return {"success": True, "data": network_info.dict()}
    except Exception as e:
        logger.error(f"获取网络信息失败: {e}")
        return JSONResponse(
            status_code=500, content={"success": False, "error": str(e)}
        )


@router.get("/processes", response_model=dict)
async def get_processes_info():
    """获取进程信息"""
    try:
        processes_info = monitor_service.get_processes_info()
        return {"success": True, "data": [p.dict() for p in processes_info]}
    except Exception as e:
        logger.error(f"获取进程信息失败: {e}")
        return JSONResponse(
            status_code=500, content={"success": False, "error": str(e)}
        )


# 已废弃 - 不再提供 /all 接口，请使用具体的模块接口
# @router.get("/all", response_model=dict)
# async def get_all_monitor_data():
#     """获取所有监控数据"""
#     try:
#         monitor_data = monitor_service.get_all_monitor_data()
#         return {"success": True, "data": monitor_data.dict()}
#     except Exception as e:
#         logger.error(f"获取监控数据失败: {e}")
#         return JSONResponse(
#             status_code=500,
#             content={"success": False, "error": str(e)}
#         )


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket端点，实时推送监控数据"""
    try:
        await manager.connect(websocket)

        # 发送初始数据
        try:
            # 获取当前时间戳
            current_timestamp = int(time.time() * 1000)

            # 使用简化版数据，减少数据量
            system_info = monitor_service.get_system_info()
            cpu_info = monitor_service.get_cpu_info()
            memory_info = monitor_service.get_memory_info()

            # 构建简化的初始数据
            simple_data = {
                "type": "monitor_data",
                "data": {
                    "system": system_info.dict(),
                    "cpu": cpu_info.dict(),
                    "memory": memory_info.dict(),
                    "timestamp": current_timestamp,
                },
            }

            # 发送简化的初始数据
            await manager.send_personal_message(json.dumps(simple_data), websocket)
            logger.info("初始数据发送成功")

            # 等待一段时间，确保初始数据已经被处理
            await asyncio.sleep(1)

            # 发送完整数据
            try:
                complete_data = monitor_service.get_all_monitor_data()
                message = json.dumps(
                    {"type": "monitor_data", "data": complete_data.dict()}
                )
                await manager.send_personal_message(message, websocket)
            except Exception as e:
                logger.error(f"发送完整数据失败: {str(e)}")
        except Exception as e:
            logger.error(f"发送初始数据失败: {str(e)}")

        # 持续发送监控数据
        update_interval = 3  # 更新间隔（秒）

        while True:
            try:
                # 每隔一段时间发送一次数据
                await asyncio.sleep(update_interval)

                # 检查连接是否仍然活跃
                if websocket.client_state.name != "CONNECTED":
                    logger.info("客户端已断开连接，停止发送数据")
                    break

                # 获取当前时间戳
                current_timestamp = int(time.time() * 1000)

                # 获取所有监控数据
                system_info = monitor_service.get_system_info()
                cpu_info = monitor_service.get_cpu_info()
                memory_info = monitor_service.get_memory_info()
                disk_info = monitor_service.get_disk_info()
                network_info = monitor_service.get_network_info()
                processes = monitor_service.get_processes_info()[
                    :10
                ]  # 只发送前10个进程

                # 构建完整数据包
                complete_data = {
                    "type": "monitor_data",
                    "data": {
                        "system": system_info.dict(),
                        "cpu": cpu_info.dict(),
                        "memory": memory_info.dict(),
                        "disk": disk_info.dict(),
                        "network": network_info.dict(),
                        "processes": [p.dict() for p in processes],
                        "timestamp": current_timestamp,
                    },
                }

                # 发送完整数据
                await manager.send_personal_message(
                    json.dumps(complete_data), websocket
                )

            except WebSocketDisconnect:
                logger.info("WebSocket客户端断开连接")
                break
            except Exception as e:
                logger.error(f"发送监控数据失败: {str(e)}")
                # 不要立即退出循环，尝试在下一个周期继续发送
                await asyncio.sleep(1)
    except WebSocketDisconnect:
        logger.info("WebSocket客户端断开连接")
    except Exception as e:
        logger.error(f"WebSocket连接异常: {e}")
    finally:
        try:
            manager.disconnect(websocket)
        except Exception as e:
            logger.error(f"断开连接失败: {e}")


# 后台任务：定期广播监控数据给所有连接的客户端
async def broadcast_monitor_data():
    """后台任务：定期广播监控数据"""
    while True:
        try:
            if manager.active_connections:
                monitor_data = monitor_service.get_all_monitor_data()
                message = json.dumps(
                    {"type": "broadcast_data", "data": monitor_data.dict()}
                )
                await manager.broadcast(message)

            await asyncio.sleep(3)  # 每3秒广播一次

        except Exception as e:
            logger.error(f"广播监控数据失败: {e}")
            await asyncio.sleep(5)  # 出错时等待5秒再重试
