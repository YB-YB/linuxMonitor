#!/bin/bash

# SSL 证书设置脚本

set -e

# 检查参数
if [ $# -eq 0 ]; then
    echo "使用方法: $0 <domain-name>"
    echo "例如: $0 example.com"
    exit 1
fi

DOMAIN=$1
EMAIL="your-email@example.com"  # 替换为你的邮箱

echo "🔐 为域名 $DOMAIN 设置 SSL 证书..."

# 安装 certbot
if ! command -v certbot &> /dev/null; then
    echo "📦 安装 certbot..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get update
        sudo apt-get install -y certbot
    elif command -v yum &> /dev/null; then
        sudo yum install -y certbot
    else
        echo "❌ 无法自动安装 certbot，请手动安装"
        exit 1
    fi
fi

# 创建 webroot 目录
sudo mkdir -p /var/www/certbot

# 临时启动 nginx 用于验证
echo "🌐 启动临时 nginx 服务..."
docker run --rm -d \
    --name temp-nginx \
    -p 80:80 \
    -v /var/www/certbot:/var/www/certbot:ro \
    -v $(pwd)/nginx/temp.conf:/etc/nginx/conf.d/default.conf:ro \
    nginx:alpine

# 创建临时 nginx 配置
cat > nginx/temp.conf << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 200 'OK';
        add_header Content-Type text/plain;
    }
}
EOF

# 获取证书
echo "📜 获取 SSL 证书..."
sudo certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN \
    -d www.$DOMAIN

# 停止临时 nginx
docker stop temp-nginx || true

# 复制证书到项目目录
echo "📋 复制证书文件..."
sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem nginx/ssl/
sudo chown $USER:$USER nginx/ssl/*.pem

# 设置证书自动续期
echo "🔄 设置证书自动续期..."
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet && docker-compose -f $(pwd)/docker-compose.prod.yml restart nginx") | crontab -

echo "✅ SSL 证书设置完成！"
echo "🔐 证书位置: nginx/ssl/"
echo "📅 证书将自动续期"