# Nginx Prod Templates

Target: prod server 91.98.83.216
Domains:
- api.beauty.designcorp.eu → 7020
- admin.beauty.designcorp.eu → 7002
- salon.beauty.designcorp.eu → 7001
- client.beauty.designcorp.eu → 7003
- beauty.designcorp.eu (landing) → 7004
- code.beauty.designcorp.eu → 6080

Notes:
- Use Let's Encrypt certs in /etc/letsencrypt/live/<domain>/
- Redirect HTTP→HTTPS
- Proxy headers for WebSocket where needed (notifications)
- Upstream ports aligned with prod mapping
