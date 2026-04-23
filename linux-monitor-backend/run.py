#!/usr/bin/env python3
"""
Linux系统监控后端服务启动脚本
"""

import argparse
import os
import sys

import uvicorn

from app.core.logging_config import get_logger, setup_logging

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# 设置日志配置
setup_logging()
logger = get_logger(__name__)


def parse_args():
    """解析命令行参数"""
    parser = argparse.ArgumentParser(description="Linux系统监控后端服务")
    parser.add_argument("--port", type=int, default=8002, help="服务端口号")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="服务主机地址")
    parser.add_argument("--reload", action="store_true", help="是否启用热重载")
    parser.add_argument(
        "--log-level",
        type=str,
        default="info",
        choices=["debug", "info", "warning", "error", "critical"],
        help="日志级别",
    )
    parser.add_argument(
        "--env",
        type=str,
        default="development",
        choices=["development", "production", "docker"],
        help="运行环境",
    )
    return parser.parse_args()


if __name__ == "__main__":
    # 解析命令行参数
    args = parse_args()
    port = args.port
    host = args.host
    reload = args.reload
    log_level = args.log_level
    env = args.env

    # 根据环境设置日志级别
    if env == "production":
        # 生产环境使用配置文件中的设置
        pass
    elif env == "development":
        # 开发环境可以覆盖配置文件
        log_level = "debug"
        reload = True

    logger.info("🚀 启动Linux系统监控后端服务...")
    logger.info(f"📊 API文档: http://{host}:{port}/docs")
    logger.info(f"🔌 WebSocket: ws://{host}:{port}/api/monitor/ws")
    logger.info(f"❤️  健康检查: http://{host}:{port}/health")
    logger.info(f"🌍 运行环境: {env}")
    logger.info(f"📝 日志级别: {log_level}")
    logger.info("-" * 50)

    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=reload,
        log_level=log_level,
        access_log=True,
    )
