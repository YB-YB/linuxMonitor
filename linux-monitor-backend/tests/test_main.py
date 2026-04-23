import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_read_root():
    """测试根路径"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data


def test_health_check():
    """测试健康检查端点"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_get_system_info():
    """测试获取系统信息"""
    response = client.get("/api/monitor/system")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "hostname" in data["data"]

def test_get_cpu_info():
    """测试获取CPU信息"""
    response = client.get("/api/monitor/cpu")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "usage" in data["data"]

def test_get_memory_info():
    """测试获取内存信息"""
    response = client.get("/api/monitor/memory")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "total" in data["data"]

def test_get_disk_info():
    """测试获取磁盘信息"""
    response = client.get("/api/monitor/disk")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "total" in data["data"]
    assert "used" in data["data"]
    assert "free" in data["data"]
    assert "percent" in data["data"]

def test_get_network_info():
    """测试获取网络信息"""
    response = client.get("/api/monitor/network")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "uploadSpeed" in data["data"]

def test_get_processes_info():
    """测试获取进程信息"""
    response = client.get("/api/monitor/processes")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert isinstance(data["data"], list)
