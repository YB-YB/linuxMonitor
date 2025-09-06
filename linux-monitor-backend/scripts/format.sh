#!/bin/bash

# 激活虚拟环境
source .venv/bin/activate

echo "🎨 格式化代码..."

# 使用 black 格式化
echo "运行 black..."
uv run black .

# 使用 isort 排序导入
echo "运行 isort..."
uv run isort .

echo "✅ 代码格式化完成！"