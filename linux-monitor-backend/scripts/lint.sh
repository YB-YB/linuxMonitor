#!/bin/bash

# 激活虚拟环境
source .venv/bin/activate

echo "🔍 代码检查..."

# 运行 flake8
echo "运行 flake8..."
uv run flake8 .

# 运行 mypy
echo "运行 mypy..."
uv run mypy .

echo "✅ 代码检查完成！"