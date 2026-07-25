#!/bin/bash
set -euo pipefail

# ============================================
# 部署脚本：为元宝游戏启动 HTTP 服务器
# 使用前确保 Node.js 和 npm 已安装
# ============================================

# 配置变量
PORT="${PORT:-8882}"                      # 监听端口，可通过环境变量覆盖
SOURCE_DIR="${SOURCE_DIR:-/Users/guccang/autoworksapce/yuanbao}"  # 源码目录，也可通过环境变量覆盖
LOG_FILE="${LOG_FILE:-server.log}"        # 日志文件

# 切换到源码目录
cd "$SOURCE_DIR"

# 检查 Node.js 是否可用
if ! command -v node &>/dev/null; then
    echo "错误：未找到 Node.js，请先安装。"
    exit 1
fi

# 确保 http-server 可用（优先用 npx，避免全局安装冲突）
# REVIEW: 如果团队偏好全局安装，可改为 npm install -g http-server
if ! command -v http-server &>/dev/null; then
    echo "http-server 未全局安装，将使用 npx 临时运行。"
    # 如果 npx 也不可用，则报错
    if ! command -v npx &>/dev/null; then
        echo "错误：既没有 http-server 也没有 npx，请先安装 http-server。"
        exit 1
    fi
    SERVER_CMD="npx http-server"
else
    SERVER_CMD="http-server"
fi

# 停止旧服务器（如果有）
# 仅查找 LISTEN 状态的进程，忽略浏览器等瞬态客户端连接
echo "检查端口 $PORT 上的旧进程..."
OLD_PID=$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)
if [ -n "$OLD_PID" ]; then
    for PID in $OLD_PID; do
        if ps -p "$PID" -o comm= | grep -E '(node|http-server)' &>/dev/null; then
            echo "发现旧进程 PID=$PID，正在停止..."
            kill "$PID" 2>/dev/null || true
            sleep 1
            if kill -0 "$PID" 2>/dev/null; then
                kill -9 "$PID" 2>/dev/null || true
            fi
            echo "旧进程已停止。"
        else
            echo "端口 $PORT 被其他进程占用（PID=$PID），请手动检查。"
        fi
    done
fi

# 启动 http-server 作为后台守护进程
echo "启动 HTTP 服务器，端口 $PORT..."
nohup $SERVER_CMD -p "$PORT" --cors --log-ip 2>> "$LOG_FILE" &
NEW_PID=$!
echo "服务器已启动，PID=$NEW_PID"

# 等待几秒检查服务是否正常运行
sleep 2
if kill -0 "$NEW_PID" 2>/dev/null; then
    echo "部署成功！服务运行在 http://localhost:$PORT/"
    echo "日志文件：$SOURCE_DIR/$LOG_FILE"
else
    echo "错误：服务器未能启动，请检查日志。"
    exit 1
fi