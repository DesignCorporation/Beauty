# Systemd Units (Prod Template)

**Target:** Prod server (ports 700x / DB 7100)
**Services:** api-gateway, auth-service, salon-api, images-api, notification-service, payment-service, mcp-server, backup-service, frontend (admin/salon/client/landing)

## Usage
- Copy unit files to `/etc/systemd/system/`
- Adjust `WorkingDirectory` if different; ensure Node and env files exist
- Reload and enable: `systemctl daemon-reload && systemctl enable --now <unit>`
- Logs: `journalctl -u <unit> -f`

## Environment
- `.env.production` at `/opt/beauty-dev/.env.production`
- DB prod on port 7100
- Node 22.21.1, pnpm 10.24.0
