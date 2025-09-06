.PHONY: help setup dev install format lint test clean

help: ## 显示帮助信息
	@echo "可用命令："
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

setup: ## 设置开发环境
	@./scripts/setup.sh

install: ## 安装依赖
	uv sync

install-dev: ## 安装开发依赖
	uv sync --extra dev

dev: ## 启动开发服务器
	@./scripts/dev.sh

format: ## 格式化代码
	@./scripts/format.sh

lint: ## 代码检查
	@./scripts/lint.sh

test: ## 运行测试
	@./scripts/test.sh

clean: ## 清理缓存文件
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	rm -rf build/
	rm -rf dist/
	rm -rf .pytest_cache/
	rm -rf .coverage

venv: ## 创建虚拟环境
	uv python install 3.13
	uv venv --python 3.13

activate: ## 显示激活虚拟环境的命令
	@echo "运行以下命令激活虚拟环境："
	@echo "source .venv/bin/activate"

requirements: ## 导出requirements.txt (兼容性)
	uv pip freeze > requirements.txt

update: ## 更新依赖
	uv lock --upgrade

info: ## 显示项目信息
	@echo "项目: Linux Monitor Backend"
	@echo "Python版本: $(shell cat .python-version)"
	@echo "uv版本: $(shell uv --version)"
	@echo "虚拟环境: .venv"