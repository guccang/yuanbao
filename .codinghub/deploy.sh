#!/bin/bash
set -euo pipefail

PORT="${PORT:-8882}"
SOURCE_DIR="${SOURCE_DIR:-.}"
LOG_FILE="${LOG_FILE:-server.log}"

cd "$SOURCE_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "错误：未找到 Node.js。"
  exit 1
fi

OLD_PIDS="$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$OLD_PIDS" ]; then
  for PID in $OLD_PIDS; do
    PROCESS="$(ps -p "$PID" -o comm= 2>/dev/null || true)"
    if [[ "$PROCESS" == *node* ]]; then
      kill "$PID" 2>/dev/null || true
    else
      echo "错误：端口 $PORT 已被非 Node.js 进程占用（PID=$PID）。"
      exit 1
    fi
  done
fi

PORT="$PORT" SOURCE_DIR="$PWD" nohup node server.js >> "$LOG_FILE" 2>&1 &
NEW_PID=$!

for _ in 1 2 3 4 5; do
  if curl --fail --silent "http://127.0.0.1:$PORT/" >/dev/null; then
    echo "部署成功：http://localhost:$PORT/（PID=$NEW_PID）"
    exit 0
  fi
  sleep 1
done

echo "错误：服务启动失败，请查看 $LOG_FILE。"
exit 1
