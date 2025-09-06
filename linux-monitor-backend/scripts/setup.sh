#!/bin/bash

# 设置脚本在遇到错误时退出
set -e

echo "🚀 设置 Linux Monitor Backend 开发环境..."

# 检查 uv 是否安装
if ! command -v uv &> /dev/null; then
    echo "❌ uv 未安装，正在安装..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    source ~/.bashrc
fi

echo "✅ uv 已安装"

# 创建虚拟环境并安装依赖
echo "📦 创建 Python 3.13 虚拟环境并安装依赖..."
uv python install 3.13
uv sync

echo "🔧 安装开发依赖..."
uv sync --extra dev

# 复制环境变量文件
if [ ! -f .env ]; then
    echo "📝 创建环境变量文件..."
    cp .env.example .env
    echo "请编辑 .env 文件设置你的配置"
fi

# 创建日志目录
mkdir -p logs

echo "✅ 环境设置完成！"
echo ""
echo "下一步："
echo "1. 编辑 .env 文件设置你的配置"
echo "2. 运行 'source .venv/bin/activate' 激活虚拟环境"
echo "3. 运行 'uvicorn app.main:app --reload' 启动开发服务器"