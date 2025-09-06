# Linux系统监控 Docker部署指南

本项目使用Docker进行部署，可以监控宿主机的CPU、内存、磁盘和网络等系统资源。

## 项目结构

- `linux-monitor-backend`: Python后端服务，基于FastAPI
- `linux-monitor-dashboard`: 前端界面，基于React

## 环境要求

- Docker
- Docker Compose

## 快速开始

1. 克隆项目到本地

```bash
git clone <项目地址>
cd <项目目录>
```

2. 构建并启动服务

```bash
docker-compose up -d
```

3. 访问监控界面

打开浏览器，访问 `http://localhost`

## 配置说明

### 后端服务

后端服务通过挂载宿主机的 `/proc` 和 `/sys` 目录，获取宿主机的真实系统信息。

主要配置：
- 端口: 8002
- 挂载目录: 
  - `/proc` -> `/host/proc`
  - `/sys` -> `/host/sys`

### 前端服务

前端服务使用Nginx提供静态文件服务，并将API请求代理到后端服务。

主要配置：
- 端口: 80
- API代理: `/api` -> `http://backend:8002`
- WebSocket代理: `/api/monitor/ws` -> `ws://backend:8002`

## 目录映射

项目配置了以下目录映射，方便开发和修改：

- 后端代码: `./linux-monitor-backend:/app`
- 前端代码: `./linux-monitor-dashboard:/app:ro`
- Nginx配置: `./linux-monitor-dashboard/nginx.conf:/etc/nginx/conf.d/default.conf:ro`

## 常见问题

### 1. 如何查看日志？

```bash
# 查看后端日志
docker-compose logs -f backend

# 查看前端日志
docker-compose logs -f frontend
```

### 2. 如何重启服务？

```bash
# 重启所有服务
docker-compose restart

# 重启单个服务
docker-compose restart backend
docker-compose restart frontend
```

### 3. 如何修改配置？

修改对应的配置文件后，重新构建并启动服务：

```bash
docker-compose up -d --build