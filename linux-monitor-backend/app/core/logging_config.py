import logging.config
import os

import yaml


def setup_logging(
    default_level=logging.INFO, config_path="config/logging.yaml", env_key="LOG_CONFIG"
):
    """
    设置日志配置

    参数:
        default_level: 默认日志级别
        config_path: 配置文件路径
        env_key: 环境变量名，用于指定配置文件路径
    """
    # 从环境变量获取配置文件路径
    path = os.getenv(env_key, config_path)

    # 如果配置文件存在，使用配置文件
    if os.path.exists(path):
        with open(path, "rt") as f:
            try:
                config = yaml.safe_load(f.read())
                logging.config.dictConfig(config)
                print(f"已加载日志配置文件: {path}")
                return
            except Exception as e:
                print(f"加载日志配置文件失败: {e}")
                print("使用默认日志配置")
    else:
        print(f"日志配置文件不存在: {path}")
        print("使用默认日志配置")

    # 使用默认配置
    logging.basicConfig(
        level=default_level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.StreamHandler(),  # 控制台输出
            logging.FileHandler("backend.log"),  # 文件输出
        ],
    )


def get_logger(name):
    """
    获取指定名称的日志记录器

    参数:
        name: 日志记录器名称

    返回:
        Logger: 日志记录器
    """
    return logging.getLogger(name)
