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
    """测试健康检查"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_monitor_system():
    """测试系统监控接口"""
    response = client.get("/api/monitor/system")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] == True
    assert "data" in data


def test_monitor_cpu():
    """测试CPU监控接口"""
    response = client.get("/api/monitor/cpu")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] == True
    assert "data" in data


def test_monitor_memory():
    """测试内存监控接口"""
    response = client.get("/api/monitor/memory")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] == True
    assert "data" in data
