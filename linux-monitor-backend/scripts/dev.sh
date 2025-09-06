#!/bin/bash

# 激活虚拟环境
source .venv/bin/activate

# 启动开发服务器
echo "🚀 启动开发服务器..."
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000