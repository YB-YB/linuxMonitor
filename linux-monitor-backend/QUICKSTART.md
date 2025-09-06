# 快速启动指南

## 1. 安装 uv

```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# 重新加载shell配置
source ~/.bashrc  # 或 source ~/.zshrc
```

## 2. 设置项目

```bash
# 进入项目目录
cd linux-monitor-backend

# 安装 Python 3.13 并设置项目
make setup
# 或者
./scripts/setup.sh
```

## 3. 启动开发服务器

```bash
# 方法1: 使用 Makefile
make dev

# 方法2: 使用脚本
./scripts/dev.sh

# 方法3: 手动启动
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 4. 常用命令

```bash
# 查看所有可用命令
make help

# 安装依赖
make install

# 格式化代码
make format

# 代码检查
make lint

# 运行测试
make test

# 清理缓存
make clean
```

## 5. 开发工作流

1. **激活虚拟环境**
   ```bash
   source .venv/bin/activate
   ```

2. **安装新依赖**
   ```bash
   uv add package-name
   # 或开发依赖
   uv add --dev package-name
   ```

   **注意**: 如果遇到 Python 版本问题，可以重新安装 Python 3.13：
   ```bash
   uv python install 3.13
   ```

3. **更新依赖**
   ```bash
   uv lock --upgrade
   ```

4. **运行测试**
   ```bash
   make test
   ```

5. **格式化和检查代码**
   ```bash
   make format
   make lint
   ```

## 6. 项目结构

```
linux-monitor-backend/
├── app/                 # 应用代码
│   ├── api/            # API路由
│   ├── core/           # 核心配置
│   ├── models/         # 数据模型
│   ├── services/       # 业务逻辑
│   └── main.py         # 应用入口
├── tests/              # 测试文件
├── scripts/            # 脚本文件
├── config/             # 配置文件
├── logs/               # 日志文件
├── pyproject.toml      # 项目配置
├── .python-version     # Python版本
├── .env.example        # 环境变量示例
├── Makefile           # 常用命令
└── README.md          # 项目文档
```

## 7. 环境变量

复制 `.env.example` 到 `.env` 并根据需要修改配置。

## 8. API文档

启动服务后访问：
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc