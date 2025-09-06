#!/bin/bash

# 激活虚拟环境
source .venv/bin/activate

echo "🧪 运行测试..."

# 运行测试
uv run pytest -v

echo "✅ 测试完成！"