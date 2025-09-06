#!/bin/bash

# 维护脚本

case "$1" in
    "logs")
        docker-compose -f docker-compose.prod.yml logs -f
        ;;
    "status")
        docker-compose -f docker-compose.prod.yml ps
        ;;
    "restart")
        docker-compose -f docker-compose.prod.yml restart
        ;;
    "update")
        git pull
        docker-compose -f docker-compose.prod.yml build --no-cache
        docker-compose -f docker-compose.prod.yml up -d
        ;;
    "backup")
        mkdir -p backups
        docker-compose -f docker-compose.prod.yml exec backend tar -czf /tmp/logs-backup.tar.gz /app/logs
        docker cp linux-monitor-backend:/tmp/logs-backup.tar.gz backups/logs-$(date +%Y%m%d-%H%M%S).tar.gz
        echo "备份完成: backups/logs-$(date +%Y%m%d-%H%M%S).tar.gz"
        ;;
    "clean")
        docker system prune -f
        docker volume prune -f
        ;;
    *)
        echo "使用方法: $0 {logs|status|restart|update|backup|clean}"
        echo "  logs    - 查看日志"
        echo "  status  - 查看服务状态"
        echo "  restart - 重启服务"
        echo "  update  - 更新服务"
        echo "  backup  - 备份数据"
        echo "  clean   - 清理系统"
        ;;
esac