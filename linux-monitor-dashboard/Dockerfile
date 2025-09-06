# 构建阶段
FROM node:22-alpine as build

# 定义构建参数
ARG VITE_DOCKER_ENV=true
ARG VITE_API_BASE_URL=/api/monitor
ARG VITE_WS_BASE_URL=auto

WORKDIR /app

# 复制依赖文件并安装依赖
COPY package*.json ./
RUN npm ci --only=production=false && npm cache clean --force

# 复制源代码
COPY . .

# 设置环境变量
ENV VITE_DOCKER_ENV=${VITE_DOCKER_ENV}
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_WS_BASE_URL=${VITE_WS_BASE_URL}

# 构建应用，使用docker环境配置
RUN npm run build:docker

# 生产阶段 - 使用nginx提供静态文件服务
FROM nginx:alpine

# 安装curl用于健康检查
RUN apk add --no-cache curl

# 复制构建产物和nginx配置
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:80/ || exit 1

# 启动nginx
CMD ["nginx", "-g", "daemon off;"]