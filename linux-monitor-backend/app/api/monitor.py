import asyncio
import json
import time

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse

from ..core.logging_config import get_logger
from ..services.monitor_service import MonitorService

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
        return {"success": True, "data": system_info.model_dump()}
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
        return {"success": True, "data": cpu_info.model_dump()}
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
        return {"success": True, "data": memory_info.model_dump()}
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
        return {"success": True, "data": disk_info.model_dump()}
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
        return {"success": True, "data": network_info.model_dump()}
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
        return {"success": True, "data": [p.model_dump() for p in processes_info]}
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
    logger.info("WebSocket连接请求到达")
    try:
        await manager.connect(websocket)
        logger.info("WebSocket连接已接受")

        # 发送初始数据
        try:
            current_timestamp = int(time.time() * 1000)
            logger.info("开始获取初始系统数据...")

            system_info = monitor_service.get_system_info()
            cpu_info = monitor_service.get_cpu_info()
            memory_info = monitor_service.get_memory_info()
            logger.info("初始系统数据获取完成")

            simple_data = {
                "type": "monitor_data",
                "data": {
                    "system": system_info.model_dump(),
                    "cpu": cpu_info.model_dump(),
                    "memory": memory_info.model_dump(),
                    "timestamp": current_timestamp,
                },
            }

            logger.info("准备发送初始简化数据...")
            await manager.send_personal_message(json.dumps(simple_data), websocket)
            logger.info("初始简化数据发送成功")

            await asyncio.sleep(0.5)

            try:
                logger.info("开始获取完整监控数据...")
                complete_data = monitor_service.get_all_monitor_data()
                logger.info("完整监控数据获取完成")
                message = json.dumps(
                    {"type": "monitor_data", "data": complete_data.model_dump()}
                )
                logger.info("准备发送完整数据...")
                await manager.send_personal_message(message, websocket)
                logger.info("完整数据发送成功")
            except Exception as e:
                logger.error(f"发送完整数据失败: {str(e)}", exc_info=True)
        except Exception as e:
            logger.error(f"发送初始数据失败: {str(e)}", exc_info=True)

        update_interval = 3

        while True:
            try:
                await asyncio.sleep(update_interval)

                if websocket.client_state.name != "CONNECTED":
                    logger.info("客户端已断开连接，停止发送数据")
                    break

                current_timestamp = int(time.time() * 1000)

                complete_data = monitor_service.get_all_monitor_data()
                complete_data_dict = {
                    "type": "monitor_data",
                    "data": {
                        "system": complete_data.system.model_dump(),
                        "cpu": complete_data.cpu.model_dump(),
                        "memory": complete_data.memory.model_dump(),
                        "disk": complete_data.disk.model_dump(),
                        "network": complete_data.network.model_dump(),
                        "processes": [p.model_dump() for p in complete_data.processes],
                        "timestamp": current_timestamp,
                    },
                }

                await manager.send_personal_message(
                    json.dumps(complete_data_dict), websocket
                )

            except WebSocketDisconnect:
                logger.info("WebSocket客户端断开连接")
                break
            except Exception as e:
                logger.error(f"发送监控数据失败: {str(e)}", exc_info=True)
                await asyncio.sleep(1)
    except WebSocketDisconnect:
        logger.info("WebSocket客户端断开连接")
    except Exception as e:
        logger.error(f"WebSocket连接异常: {e}", exc_info=True)
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
                    {"type": "broadcast_data", "data": monitor_data.model_dump()}
                )
                await manager.broadcast(message)

            await asyncio.sleep(3)  # 每3秒广播一次

        except Exception as e:
            logger.error(f"广播监控数据失败: {e}")
            await asyncio.sleep(5)  # 出错时等待5秒再重试
