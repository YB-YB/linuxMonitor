# Linux Monitor Backend

Linux系统监控后端服务，使用FastAPI构建。

## 环境要求

- Python 3.13+
- uv (Python包管理器)

## 快速开始

### 1. 安装 uv

```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# 或者使用 pip
pip install uv
```

### 2. 创建虚拟环境并安装依赖

```bash
# 进入项目目录
cd linux-monitor-backend

# 安装 Python 3.13 并创建虚拟环境
uv python install 3.13
uv sync

# 或者手动创建虚拟环境
uv venv --python 3.13
source .venv/bin/activate  # Linux/macOS
# .venv\Scripts\activate   # Windows

# 安装依赖
uv pip install -e .
```

### 3. 运行开发服务器

```bash
# 激活虚拟环境
source .venv/bin/activate

# 启动服务
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 4. 开发工具

```bash
# 安装开发依赖
uv sync --extra dev

# 代码格式化
uv run black .
uv run isort .

# 代码检查
uv run flake8 .
uv run mypy .

# 运行测试
uv run pytest
```

## 项目结构

```
linux-monitor-backend/
├── app/
│   ├── api/          # API路由
│   ├── core/         # 核心配置
│   ├── models/       # 数据模型
│   ├── services/     # 业务逻辑
│   └── main.py       # 应用入口
├── config/           # 配置文件
├── logs/            # 日志文件
├── pyproject.toml   # 项目配置和依赖
├── .python-version  # Python版本
└── README.md
```

## 环境变量

创建 `.env` 文件：

```env
# 应用配置
APP_NAME=Linux Monitor Backend
APP_VERSION=0.1.0
DEBUG=true

# 服务器配置
HOST=0.0.0.0
PORT=8000

# 安全配置
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

## API文档

启动服务后访问：
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc