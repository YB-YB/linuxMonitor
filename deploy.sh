#!/bin/bash

# Linux 监控系统部署脚本

set -e

echo "🚀 开始部署 Linux 监控系统..."

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    exit 1
fi

# 检查 Docker Compose 是否安装
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose 未安装，请先安装 Docker Compose"
    exit 1
fi

# 创建必要的目录
echo "📁 创建必要的目录..."
mkdir -p nginx/ssl
mkdir -p logs

# 设置权限
echo "🔐 设置文件权限..."
chmod +x deploy.sh
chmod 644 docker-compose.prod.yml
chmod 644 nginx/nginx.conf

# 停止现有服务
echo "🛑 停止现有服务..."
docker-compose -f docker-compose.prod.yml down --remove-orphans || true

# 清理旧镜像（可选）
read -p "是否清理旧的 Docker 镜像？(y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🧹 清理旧镜像..."
    docker system prune -f
fi

# 构建并启动服务
echo "🔨 构建并启动服务..."
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 30

# 检查服务状态
echo "📊 检查服务状态..."
docker-compose -f docker-compose.prod.yml ps

# 检查健康状态
echo "❤️ 检查服务健康状态..."
for i in {1..10}; do
    if curl -f http://localhost:8002/health > /dev/null 2>&1; then
        echo "✅ 后端服务健康检查通过"
        break
    else
        echo "⏳ 等待后端服务启动... ($i/10)"
        sleep 5
    fi
done

for i in {1..10}; do
    if curl -f http://localhost:8001/ > /dev/null 2>&1; then
        echo "✅ 前端服务健康检查通过"
        break
    else
        echo "⏳ 等待前端服务启动... ($i/10)"
        sleep 5
    fi
done

echo "🎉 部署完成！"
echo "📊 监控面板: http://your-domain.com"
echo "📚 API 文档: http://your-domain.com/docs"
echo "📝 查看日志: docker-compose -f docker-compose.prod.yml logs -f"
echo "🔄 重启服务: docker-compose -f docker-compose.prod.yml restart"
echo "🛑 停止服务: docker-compose -f docker-compose.prod.yml down"