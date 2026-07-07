#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/agentuser/workspace/yinian}"
SERVICE_NAME="${SERVICE_NAME:-yinian}"
PORT="${PORT:-3011}"
DOMAIN="${DOMAIN:-www.pdfyiwen.cloud}"

cd "$APP_DIR"

npm ci
npm run test
npm run build:server

mkdir -p "$APP_DIR/server-data/uploads"

sudo tee "/etc/systemd/system/${SERVICE_NAME}.service" >/dev/null <<SERVICE
[Unit]
Description=Yinian online idea notebook
After=network.target

[Service]
Type=simple
User=agentuser
WorkingDirectory=${APP_DIR}
Environment=NODE_ENV=production
Environment=PORT=${PORT}
Environment=YINIAN_DATA_DIR=${APP_DIR}/server-data
Environment=YINIAN_UPLOAD_DIR=${APP_DIR}/server-data/uploads
Environment=YINIAN_PUBLIC_DIR=${APP_DIR}/dist
Environment=YINIAN_BASE_PATH=/yinian
ExecStart=$(command -v node) ${APP_DIR}/server/server.mjs
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
SERVICE

sudo systemctl daemon-reload
sudo systemctl enable "${SERVICE_NAME}"
sudo systemctl restart "${SERVICE_NAME}"

if command -v nginx >/dev/null 2>&1; then
  sudo tee "/etc/nginx/sites-available/${SERVICE_NAME}" >/dev/null <<NGINX
server {
    listen 80;
    server_name ${DOMAIN};

    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX
  sudo ln -sfn "/etc/nginx/sites-available/${SERVICE_NAME}" "/etc/nginx/sites-enabled/${SERVICE_NAME}"
  sudo nginx -t
  sudo systemctl reload nginx
fi

HEALTH_URL="http://127.0.0.1:${PORT}/api/health"
for attempt in $(seq 1 20); do
  if curl -fsS "$HEALTH_URL" >/tmp/yinian-health-check.out 2>/dev/null; then
    cat /tmp/yinian-health-check.out
    echo
    echo "Yinian deployed. Open: https://${DOMAIN}/yinian/"
    exit 0
  fi
  sleep 0.5
done

echo "Yinian health check failed after waiting: ${HEALTH_URL}" >&2
sudo systemctl status "${SERVICE_NAME}" --no-pager -l >&2 || true
exit 1
