import asyncio
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.monitor import router as monitor_router
from .core.logging_config import get_logger, setup_logging

# 设置日志配置
setup_logging()
logger = get_logger(__name__)


def get_allowed_origins() -> list[str]:
    """根据环境变量获取允许的来源列表"""
    env = os.getenv("APP_ENV", "development")
    if env == "production":
        origins_str = os.getenv("CORS_ORIGINS", "")
        if origins_str:
            return [o.strip() for o in origins_str.split(",") if o.strip()]
        return []
    # 开发环境允许所有来源
    return ["*"]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动事件
    logger.info("Linux系统监控API服务启动")
    logger.info("API文档地址: http://localhost:8002/docs")
    logger.info("WebSocket端点: ws://localhost:8002/api/monitor/ws")
    yield
    # 关闭事件
    logger.info("Linux系统监控API服务关闭")


# 创建FastAPI应用
app = FastAPI(
    title="Linux系统监控API",
    description="提供Linux系统资源监控的RESTful API和WebSocket实时数据推送",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# 配置CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(monitor_router, prefix="/api/monitor", tags=["监控"])


@app.get("/")
async def root():
    """根路径"""
    return {
        "message": "Linux系统监控API服务",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "running",
    }


@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {"status": "healthy", "service": "linux-monitor-api"}



def main():
    """主函数，用于命令行启动"""
    import uvicorn

    uvicorn.run(
        "app.main:app", host="0.0.0.0", port=8000, reload=True, log_level="info"
    )


if __name__ == "__main__":
    main()
